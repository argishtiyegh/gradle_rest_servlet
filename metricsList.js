import React, { Component } from 'react';
import { Form, List, EmptyMessage } from "ui-components";
import PropTypes from 'prop-types';
import classNames from "classnames";
import { params } from "params";
import {connect} from "react-redux";
const {SearchField, Pagination, PanelToolbar} = List;
const { Select, FormGroupEmpty } = Form;
const perPageItems = 25;

function SelectAll (props) {
    return (
        <div className="control checkbox column column-25 has-selection">
            <label className={classNames("control checkbox", props.className)}>
                <input type="checkbox"
                       value={"all"}
                       checked={props.selected}
                       onChange={props.selectAll}
                />
                <span className="control__indicator"/>
                <span>{"Select All"}</span>
            </label>
        </div>
    );
}

SelectAll.propTypes = {
    className: PropTypes.string,
    props: PropTypes.object,
    selected: PropTypes.bool,
    selectAll: PropTypes.func,
};

function sortByStrings (sourceArray, sortField) {
    return sourceArray.sort((a, b) => (a[sortField].toLowerCase() > b[sortField].toLowerCase()) - (a[sortField].toLowerCase() < b[sortField].toLowerCase()));
}

function checkIfExists (SourceArray, WordsArray) {
    let ifExists = false;
    WordsArray.forEach((value) => {
        if (SourceArray.indexOf(value) !== -1) {
            ifExists = true;
        }
    });
    return ifExists;
}

function ParseCheckboxData (genericMetrics, customMetrics, props) {
    let sortedGenerics = sortByStrings(genericMetrics, "label");
    let generic =  sortedGenerics.reduce((col, cur) => {
        col.options[cur.value] =  {
            label: cur.label,
            type: cur.type,
            aggregations: cur.aggregations,
            aggregation: "",
            length: cur.length,
            checked: !!cur.selected,
            hidden: cur.hidden,
            value: cur.value
        };
        return col;
    }, {options: {}});
    let customPerConnections = {};

    // hide custom metric functionality for edit mode... need to be refactored edit logic
    customMetrics && !props.editView && customMetrics.map((con) =>
        con.customFields.reduce((col, cur) => {
            let system = cur.systems === "*" ? con.address : cur.systems;
            customPerConnections[cur.key] =  {
                key: cur.key,// key is a unique value which should go to backend
                value: cur.value,
                label: cur.label || "",
                type: "text",   // disabling aggregation for custom metrics. Need to do later
                aggregations: props.aggregations,
                aggregation: "",
                systems: system,
                checked: cur.selected === "true",
                hidden: !!cur.hidden
            };
        }, {}));
    return {
        genericOptions: generic.options,
        allCustoms: customPerConnections,
        allOptions: {
            ...generic.options,
            ...customPerConnections
        },
        disableSearch: false,
        searchPlaceholder: "Search metrics..."
    };
}

function init (templateFields, customFields) {
    let {editView} = this.props;
    this.config = ParseCheckboxData(templateFields, customFields, this.props);
    this.optionsKey = Object.keys(this.config.genericOptions);

    const filters = this.optionsKey.reduce((col, cur) => {
            let checked = this.config.genericOptions[cur].checked;
            let hidden = this.config.genericOptions[cur].hidden;
            if (editView){
                if (checked && !hidden) col[cur] = checked;
            } else col[cur] = checked;
            return col;
        }, {}
    );
    const paginationState = {
        currentPage: 1,
        totalPages: Math.ceil(Object.keys(filters).length / perPageItems),
        start: 0,
        end: perPageItems
    };
    return {
        filters,
        paginationState,
        allCustoms: this.config.allCustoms,
        searchValue: editView ? "tag:selected" : ""
    };

}

function parseTemplateFields (template) {
    return template.reduce(function(acc, cur) {
        acc[cur.value] = cur;
        return acc;
    }, {});
}

class MetricsList extends Component {
    constructor (props) {
        super(props);
        let parsedState = init.call(this, this.props.templateFields, this.props.connections);
        this.state = {
            selectedMetricCount: 0,
            searchValue: parsedState.searchValue,
            searchResult: {},
            focus: false,
            selectAll: false,
            genericFilters: parsedState.filters,
            customFilters: {},
            resultedFilters: {},
            allCustoms: parsedState.allCustoms,
            ...parsedState.paginationState
        };
        this.doCheck = this.doCheck.bind(this);
        this.doSearch = this.doSearch.bind(this);
        this.selectAll = this.selectAll.bind(this);
        this.searchAndCheck = this.searchAndCheck.bind(this);
        this.updateFilters = this.updateFilters.bind(this);
        this.nextPrev = this.nextPrev.bind(this);
        this.handleInputBlur = this.handleInputBlur.bind(this);
        this.handleInputFocus = this.handleInputFocus.bind(this);
        this.handleSelectedClick = this.handleSelectedClick.bind(this);
        this.selectAllTriggerOnSearch = this.selectAllTriggerOnSearch.bind(this);
        this.updateOnSelectAllSearch = this.updateOnSelectAllSearch.bind(this);
    }

    nextPrev (next) {
        return (event) => {
            event.stopPropagation();
            event.preventDefault();
            event.nativeEvent.stopImmediatePropagation();

            let page = next === "prev" ? (this.state.currentPage - 1) : (this.state.currentPage + 1),
                lastPage = this.state.totalPages;
            if (page === 0) {
                page = 1;
            } else if (page > lastPage) {
                page = lastPage;
            }
            let start = perPageItems * (page - 1),
                end = perPageItems * page;
            this.setState({
                start,
                end,
                currentPage: page
            });
        };
    }

    doSearch (searchTerm) {
        let {resultedFilters, selectAll} = this.state,
            term = searchTerm.toLowerCase().trim();
        if (term) {
            let searchResult = Object.keys(resultedFilters).reduce((col, cur) => {
                let name = this.config.allOptions[cur].label;
                if (name.toLowerCase().indexOf(term)!== -1) {
                    col[cur] = resultedFilters[cur];
                }
                return col;
            }, {});
            this.setState({
                searchResult: searchResult,
                searchValue: searchTerm,
                currentPage: 1,
                start: 0,
                end: perPageItems,
                totalPages: Math.ceil(Object.keys(searchResult).length / perPageItems)
            });
            this.updateSelectedMetricCount(searchResult);
            this.selectAllTriggerOnSearch(searchResult, selectAll);
        } else {
            this.setState({
                searchValue: "",
                searchResult: {},
                currentPage: 1,
                start: 0,
                end: perPageItems,
                totalPages: Math.ceil(Object.keys(resultedFilters).length / perPageItems)
            });
            this.updateSelectedMetricCount();
        }
    }
    updateSelectedMetricCount (filter) {
        let selectedFilters = filter || this.state.resultedFilters;
        let count = Object.keys(selectedFilters).filter(f => selectedFilters[f]===true).length;
        this.setState({
            selectedMetricCount: count
        });
    }

    searchAndCheck (optionValue) {
        this.setState({
            searchResult: {
                ...this.state.searchResult,
                [optionValue]: !this.state.searchResult[optionValue]
            },
        });
    }

    updateFilters(filters, optionValue, stateKey) {
        if (filters.hasOwnProperty(optionValue)) {
            let cloneDeep = JSON.parse(JSON.stringify(filters));
            cloneDeep[optionValue] = !cloneDeep[optionValue];
            this.setState({[stateKey]: cloneDeep});
        }
    }

    selectAllTriggerOnSearch (searchResult) {
        let resultsOnSearch = Object.keys(searchResult).filter((key) => searchResult[key]),
            selectAllOnSearch  = resultsOnSearch.length && resultsOnSearch.length === Object.keys(searchResult).length;
        this.setState({selectAll: selectAllOnSearch});
    }

    doCheck (event) {
        let optionValue = event.target.value,
            {searchValue, customFilters, genericFilters, selectAll} = this.state;
        if (searchValue) {
            this.searchAndCheck(optionValue);
        }
        this.updateFilters(customFilters, optionValue, "customFilters");
        this.updateFilters(genericFilters, optionValue, "genericFilters");
        this.setState((prevState) => {
            return {
                resultedFilters: {
                    ...prevState.genericFilters,
                    ...prevState.customFilters
                },
            };
        }, () => {
            if (this.state.searchValue) {
                this.updateSelectedMetricCount(this.state.searchResult);
                this.selectAllTriggerOnSearch(this.state.searchResult, selectAll);
            } else {
                this.updateSelectedMetricCount();
            }
        });
    }

    updateOnSelectAllSearch (optionValue, filters, stateKey) {
        if (typeof optionValue === "object"){
            let cloneDeep = JSON.parse(JSON.stringify(filters));
            Object.keys(optionValue).map((optionKey) => {
                if(filters.hasOwnProperty(optionKey)) {
                    cloneDeep[optionKey] = optionValue[optionKey];
                }
            });
            this.setState({[stateKey]: cloneDeep});
            return cloneDeep;
        }
    }

    selectAll () {
        let { genericFilters, customFilters, selectAll, searchValue, searchResult } = this.state;
        let updateFilters = (filters) => {
            return Object.keys(filters).reduce((col, cur) => {
                col[cur] = !this.state.selectAll;
                return col;
            }, {});
        };
        let searchSelectAll, updateGeneric, updateCustom, paginationState, resultedFilters;
        //select all when search value exists
        if (searchValue) {
            searchSelectAll = updateFilters(searchResult);
            updateGeneric = this.updateOnSelectAllSearch(searchSelectAll, genericFilters, "genericFilters");
            updateCustom = this.updateOnSelectAllSearch(searchSelectAll, customFilters, "customFilters");
            let resultedFilters = {...updateGeneric, ...updateCustom};
            paginationState = {
                currentPage: 1,
                totalPages: Math.ceil(Object.keys(searchSelectAll).length / perPageItems),
                start: 0
            };
            this.setState({
                searchResult: searchSelectAll,
                selectAll: !selectAll,
                genericFilters: updateGeneric,
                customFilters: updateCustom,
                resultedFilters,
                searchValue,
                ...paginationState
            });
            this.updateSelectedMetricCount(searchSelectAll);
        } else {
            updateGeneric = updateFilters(genericFilters);
            updateCustom = updateFilters(customFilters);
            resultedFilters = {...updateGeneric, ...updateCustom};
            paginationState = {
                currentPage: 1,
                totalPages: Math.ceil(Object.keys(resultedFilters).length / perPageItems),
                start: 0
            };
            this.setState({
                selectAll: !selectAll,
                genericFilters: updateGeneric,
                customFilters: updateCustom,
                resultedFilters: resultedFilters,
                searchValue,
                ...paginationState
            });
            this.updateSelectedMetricCount(resultedFilters);
        }
    }

    componentDidMount () {
        //temporary solution until the change of cassandra table structure.
       if (this.props.className === "disabled") {
           this.setState({selectAll: true});
       }
    }

    handleInputFocus() {
        this.setState({
            focus: true
        });
    }

    handleInputBlur() {
        this.setState({
            focus: false
        });
    }

    handleSelectedClick () {
        let  {resultedFilters, searchValue, searchResult} = this.state,
            result;
        if (searchValue) {
            result = Object.keys(searchResult).reduce((col, cur) => {
                if (searchResult[cur]) col[cur] = true;
                return col;
            }, {});
        } else {
            result = Object.keys(resultedFilters).reduce((col, cur) => {
                if (resultedFilters[cur]) col[cur] = true;
                return col;
            }, {});
        }
        this.setState({
            selectedMetricCount: Object.keys(result).length,
            searchResult: result,
            selectAll: true,
            searchValue: "tag:selected",
            currentPage: 1,
            start: 0,
            totalPages: Object.keys(result).length > 0 ? Math.ceil(Object.keys(result).length / perPageItems) : 1
        });
    }

    static getDerivedStateFromProps (nextProps, state) {
        let connectionsId = nextProps.connectionsId;
        // Make support of IE browser / removed Object.values()
        let customs = Object.keys(state.allCustoms).map((id) => {
            return state.allCustoms[id];
        });
        let customFields = sortByStrings(customs, "label");
        let collectedIds = [];
        for(let prop in connectionsId) {
            if (connectionsId.hasOwnProperty(prop)){
                collectedIds = [...collectedIds, ...connectionsId[prop]];
            }
        }
        let selectAllMetrics = Object.keys(connectionsId).map((keys) => {
            if (connectionsId[keys].length) {
                return keys;
            }
        });
        collectedIds = [...collectedIds, ...selectAllMetrics];
        // Collect customMetrics according to metric's systems from static data
        let result = customFields.filter((metric) => {
            let system = metric.systems && metric.systems.split(",");
            if (system) {
                if (system.length > 1) {
                    return checkIfExists(collectedIds, system);
                } else {
                    return collectedIds.indexOf(metric.systems) !== -1;
                }
            }
        });


        // Recover already exists metrics state and add to new ones "false" value
        const customFilters = result.reduce((col, cur) => {
                if (state.customFilters.hasOwnProperty(cur.key)) {
                    col[cur.key] = state.customFilters[cur.key];
                } else {
                    col[cur.key] = !!cur.checked;
                }
                return col;
            }, {}
        );
        const resultedFilters = {
            ...state.genericFilters,
            ...customFilters
        };
        const paginationState = {
            currentPage: 1,
            totalPages: Math.ceil(Object.keys(resultedFilters).length / perPageItems),
            start: 0,
            end: perPageItems
        };
        let searchResult = state.searchResult;
        if (state.searchValue === "tag:selected") {
            searchResult =  Object.keys(resultedFilters).reduce((col, cur) => {
                if (resultedFilters[cur]) {
                    col[cur] = true;
                }
                return col;
            }, {});
            paginationState.totalPages =  Math.ceil(Object.keys(searchResult).length / perPageItems);
        } else if(state.searchValue) {
            paginationState.totalPages =  Math.ceil(Object.keys(searchResult).length / perPageItems);
        }
        return {
            ...state,
            customFilters: customFilters,
            resultedFilters: resultedFilters,
            ...paginationState,
            searchResult,
            searchValue: "",
            selectedMetricCount: Object.keys(resultedFilters).filter(f => resultedFilters[f] === true).length
        };
    }

    componentDidUpdate(_, prevState) {
        let {resultedFilters, selectedMetricCount, searchValue, searchResult} = this.state;
        let resultedCount = Object.keys(resultedFilters).length,
            selectAll = resultedCount === selectedMetricCount;

        if (prevState.selectAll !== selectAll && !searchValue) {
            this.setState({selectAll});
        }
        this.props.collectCheckBoxData(this.state.genericFilters, this.state.customFilters, this.config.allCustoms, searchValue, searchResult);
    }


    render () {
        let className = this.props.className,
            {start, end, searchValue, selectedMetricCount, searchResult, resultedFilters, currentPage, totalPages} = this.state,
            editView = this.props.className === "disabled",
            list = searchValue ? searchResult : resultedFilters,
            emptySearchResult = (!editView && (searchValue && !Object.keys(searchResult).length) || editView) && "disabled" || "",
            {templateFields, aggregate, connectionsId} = this.props;
        const locale = params.app.locale.epm.requests;
        //for aggregation logic need to pass a template fields from redux store
        let parsedTempFields = parseTemplateFields(templateFields);
        return (
            <div className={classNames("select-clause", "form-group", "has-input", "has-list", "form-group__search")}>
                <label>{locale.template_fields}</label>
                {
                    !this.config.disableSearch ?
                        <FormGroupEmpty
                            className={classNames("no-spacing", {
                                // "has-error": error,
                                "has-focus": this.state.focus,
                            })}>
                            <SearchField
                                    placeholder = {this.config.searchPlaceholder}
                                    onChange={this.doSearch}
                                    onFocus={this.handleInputFocus}
                                    onBlur={this.handleInputBlur}
                                    value = {searchValue}
                            />
                        </FormGroupEmpty> : null
                }
                <PanelToolbar className="form-group__toolbar">
                    <SelectAll className = {emptySearchResult}
                               selectAll = {this.selectAll}
                               selected = {this.state.selectAll}
                    />
                    <div className="toolbar-counter column column-30 center-align-text has-selection">
                        <span className="selection-count badge">
                            <span className="count">{selectedMetricCount}</span>
                        </span>
                        <span onClick={this.handleSelectedClick}>{locale.selected}</span>
                    </div>
                    <Pagination
                        className="pull-right"
                        onPrevClick={this.nextPrev("prev")}
                        onNextClick={this.nextPrev()}
                        page={currentPage}
                        totalPages={totalPages}
                    />
                </PanelToolbar>

                <ul ref={this.formGroupRef} className={"form-list"}>
                    {
                        Object.keys(list).length ? Object.keys(list).slice(start, end).map((option) =>
                            {
                                return (!this.config.allOptions[option].hidden) ?
                                    <li className="datatable-item" key={option}>
                                        <div className="root-item">
                                            <div className={`selected-field ${className}`}>
                                                <label className={classNames("control checkbox", className)} key = {option}>
                                                    <input type="checkbox"
                                                           value={option && option.id ?  option.id : option }
                                                           checked={list[option]}
                                                           onChange={this.doCheck}
                                                    />
                                                    <span className="control__indicator"/>
                                                    {this.config.allOptions[option].label}
                                                    {this.config.allOptions[option].systems && !(Object.keys(connectionsId).indexOf(this.config.allOptions[option].systems) !== -1) && ` (${this.config.allOptions[option].systems})`}
                                                </label>
                                            </div>
                                            {
                                                aggregate && this.config.allOptions[option].type === "numeric" &&
                                                <div className={classNames("column column-40 field-aggregation", {
                                                    "ui-disabled": !list[option]})}>
                                                    {
                                                        <Select options={parsedTempFields[option].aggregations}
                                                                value={parsedTempFields[option].aggregation}
                                                                onChange={(e) => this.props.onAggregationChange(e, parsedTempFields[option])}/>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    </li> : null;
                            }
                        ) : <EmptyMessage>{"No Metrics found"}</EmptyMessage>}
                </ul>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        connectionsId: state.requests.properties.connections.connectionsId,
        productType: state.requests.properties.productType,
        connections: state.requests.properties.products[0].connections,
        aggregations: state.requests.properties.aggregations
    };
};

MetricsList.propTypes = {
    className: PropTypes.string,
    productType: PropTypes.string,
    aggregate: PropTypes.bool,
    editView: PropTypes.bool,
    connectionsId: PropTypes.object,
    connections: PropTypes.array,
    templateFields: PropTypes.array,
    collectCheckBoxData: PropTypes.func,
    onAggregationChange: PropTypes.func
};

export default connect(mapStateToProps)(MetricsList);