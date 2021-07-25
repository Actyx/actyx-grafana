import React, { PureComponent } from 'react';
import { QueryField } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions } from './types';

type Props = DataSourcePluginOptionsEditorProps<MyDataSourceOptions>;

export class ConfigEditor extends PureComponent<Props> {
  onManifestChange = (value: string): void => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      manifest: value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  render(): JSX.Element {
    const { options } = this.props;
    const { jsonData } = options;

    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <QueryField
            onChange={this.onManifestChange}
            query={jsonData.manifest || ''}
            placeholder="App Manifest"
            portalOrigin="Actyx"
          />
        </div>
      </div>
    );
  }
}
