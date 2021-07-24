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
    let manifest: AppManifest = JSON.parse(instanceSettings.jsonData.manifest);
    this.actyx = Actyx.of(manifest);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    console.log(options)
    const { range } = options;
    const from = range!.from.toISOString();
    const to = range!.to.toISOString();

    const actyx = await this.actyx;
    // Return a constant for each query.
    const data = await Promise.all(
      options.targets.map(async target => {
        const query = defaults(target, defaultQuery);

        const aql = query.queryText?.replace('from()', `from(${from})`)?.replace('to()', `to(${to})`);
        console.log(aql)

        const result = await actyx.queryAql(aql);
        if (result.length === 0) {
          return new MutableDataFrame({ refId: query.refId, fields: [] });
        }

        let diagnostics: string[] = [];
        let values: Value[] = [];
        for (const r of result) {
          if (r.type === 'diagnostic') {
            diagnostics.push(r.message);
          } else if (r.type === 'event') {
            values.push({ time: r.meta.timestampMicros / 1000, value: r.payload });
          }
        }

        let properties: Record<string, [FieldType, (v: Value) => unknown]> = {
          time: [FieldType.time, v => v.time],
        }

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
                    properties[k] = [FieldType.boolean, v => (v.value as any)[k]];
                    break;
                  case 'number':
                    properties[k] = [FieldType.number, v => (v.value as any)[k]];
                    break;
                  case 'string':
                    properties[k] = [FieldType.string, v => (v.value as any)[k]];
                    break;
                  default:
                    properties[k] = [FieldType.string, v => JSON.stringify((v.value as any)[k])];
                }
              }
          }
        }

        let preferred = Object.values(properties).some(x=>x[0] === FieldType.string) ? 'table' as 'table' : 'graph' as 'graph'
        console.log(preferred)

        const fields = Object.entries(properties).map(([k, v]) => ({ name: k, type: v[0] }));
        if (diagnostics.length > 0) {
          fields.push({ name: 'message', type: FieldType.string });
        }
        const data = new MutableDataFrame({
          refId: query.refId,
          fields,
          meta: {
            preferredVisualisationType: preferred
          }
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

        for (const message of diagnostics) {
          data.add({ time: 0, message });
        }

        return data;
      })
    );

    return { data };
  }

  async testDatasource() {
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: 'Success',
    };
  }
}
