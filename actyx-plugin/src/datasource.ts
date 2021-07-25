import defaults from 'lodash/defaults';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';
import { Actyx, AppManifest } from '@actyx/sdk';

type Value = { time: number; value: unknown };

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  actyx: Promise<Actyx>;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    const manifest: AppManifest = JSON.parse(instanceSettings.jsonData.manifest);
    this.actyx = Actyx.of(manifest);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    console.log(options);

    const actyx = await this.actyx;
    // Return a constant for each query.
    const data = await Promise.all(
      options.targets.map(async target => {
        const query = defaults(target, defaultQuery);

        const range = options.range;
        const aql = query.queryText
          ?.replace('from()', `from(${range.from.toISOString()})`)
          ?.replace('to()', `to(${range.to.toISOString()})`);
        console.log(aql);

        let result;
        try {
          result = await actyx.queryAql(aql);
        } catch (e) {
          console.log(e.message);
          if (e.message?.startsWith('{')) {
            const msg: { message: string } = JSON.parse(e.message);
            query.setError(msg.message);
          } else {
            query.setError(`${e}`);
          }
          throw e;
        }
        query.setError();
        if (result.length === 0) {
          return new MutableDataFrame({ refId: query.refId, fields: [] });
        }

        const diagnostics: string[] = [];
        const values: Value[] = [];
        for (const r of result) {
          if (r.type === 'diagnostic') {
            diagnostics.push(r.message);
          } else if (r.type === 'event') {
            values.push({ time: r.meta.timestampMicros / 1000, value: r.payload });
          }
        }
        query.setDiagnostics(diagnostics);

        const properties: Record<string, [FieldType, (v: Value) => unknown]> = {
          time: [FieldType.time, v => v.time],
        };

        for (const { value } of values) {
          switch (typeof value) {
            case 'boolean':
              properties.value = [FieldType.boolean, v => v.value];
              break;
            case 'number':
              properties.value = [FieldType.number, v => v.value];
              break;
            case 'string':
              properties.value = [FieldType.string, v => v.value];
              break;
            case 'object':
              for (const [k, v] of Object.entries(value || {})) {
                switch (typeof v) {
                  case 'boolean':
                    properties[k] = [FieldType.boolean, v => (v.value as { [k: string]: boolean })[k]];
                    break;
                  case 'number':
                    properties[k] = [FieldType.number, v => (v.value as { [k: string]: number })[k]];
                    break;
                  case 'string':
                    properties[k] = [FieldType.string, v => (v.value as { [k: string]: string })[k]];
                    break;
                  default:
                    properties[k] = [FieldType.string, v => JSON.stringify((v.value as { [k: string]: unknown })[k])];
                }
              }
          }
        }

        const preferred = Object.values(properties).some(x => x[0] === FieldType.string)
          ? ('table' as const)
          : ('graph' as const);

        const fields = Object.entries(properties).map(([k, v]) => ({ name: k, type: v[0] }));
        const data = new MutableDataFrame({
          refId: query.refId,
          fields,
          meta: {
            preferredVisualisationType: preferred,
          },
        });

        for (const v of values) {
          const obj: Record<string, unknown> = {};
          for (const [k, vf] of Object.entries(properties)) {
            const vv = vf[1](v);
            if (vv !== undefined) {
              obj[k] = vv;
            }
          }
          data.add(obj);
        }

        return data;
      })
    );

    return { data };
  }

  async testDatasource(): Promise<{
    status: string;
    message: string;
  }> {
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: 'Success',
    };
  }
}
