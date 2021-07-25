import defaults from 'lodash/defaults';

import React, { PureComponent } from 'react';
import { QueryField } from '@grafana/ui';
import { ExploreQueryFieldProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

type Props = ExploreQueryFieldProps<DataSource, MyQuery, MyDataSourceOptions>;
type State = {
  diagnostics: string[];
  error: string | undefined;
};

export class ExploreQueryEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    props.query.setDiagnostics = diagnostics => this.setState({ diagnostics });
    props.query.setError = error => this.setState({ error });
    this.state = { diagnostics: [], error: undefined };
  }

  onQueryTextChange = (value: string): void => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryText: value });
  };

  render(): JSX.Element {
    const query = defaults(this.props.query, defaultQuery);
    const { queryText } = query;
    const { error, diagnostics } = this.state;

    return (
      <div className="gf-form" style={{ flexWrap: 'wrap' }}>
        <QueryField
          onChange={this.onQueryTextChange}
          onBlur={this.props.onBlur}
          onRunQuery={this.props.onRunQuery}
          query={queryText || ''}
          placeholder="AQL query"
          portalOrigin="Actyx"
        />
        <label>Error:&nbsp;</label>
        {error === undefined ? 'None' : <pre style={{ overflow: 'scroll', whiteSpace: 'pre' }}>{error}</pre>}
        <div style={{ flex: 1, height: 0 }} />
        <label>Diagnostics:&nbsp;</label>
        {diagnostics.length ? (
          <pre style={{ maxWidth: '85%', height: '200px', overflow: 'scroll', whiteSpace: 'pre' }}>
            {diagnostics.join('\n')}
          </pre>
        ) : (
          'None'
        )}
      </div>
    );
  }
}
