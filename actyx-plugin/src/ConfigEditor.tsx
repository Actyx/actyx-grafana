import React, { PureComponent } from 'react';
import { QueryField } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions } from './types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onManifestChange = (value: string) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      manifest: value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  render() {
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
