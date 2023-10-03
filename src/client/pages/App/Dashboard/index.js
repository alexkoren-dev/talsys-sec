import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment'
import api from 'sec-api';
import { Card, Row, Col, notification, Form, Input, DatePicker, Select, Affix, Icon } from 'antd';
import { searchSECByQuery, addFilingUpdate } from 'client/actions/secActions';
import { upgradePayment } from 'client/actions/paymentActions';
import { SEC_KEY } from 'client/constants/config';
import StripeCheckout from 'client/pages/App/Upgrade';

import './dashboard.css';

import CompanyTable from './CompanyTable'
import FilterForm from './FilterForm'

import subscribeImg from 'client/assets/images/subscribe.svg'

const flter_item = '5.02'

// "forms": ["S-1", "S-2", "S-4", "S-11", "F-1", "F-2", "F-4", "10", "10-Q", "10-K"],
const INITIAL_QUERY = {
  "dateRange": "custom",
  "startdt": "2017-01-01",
  "enddt": moment(new Date()).format('YYYY-MM-DD'),
  "filter_forms": "S-1"
}

export class Dashboard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      pagination: {
        current: 1,
        pageSize: 100
      },
      query: INITIAL_QUERY
    };

    this.handleTableChange = this.handleTableChange.bind(this)
    this.searchsecFilings = this.searchsecFilings.bind(this)
    this.getSearchKey = this.getSearchKey.bind(this)
    this.onCardConfirm = this.onCardConfirm.bind(this)
  }

  async componentDidMount() {
    await this.searchsecFilings()
    const socket = api(SEC_KEY);

    socket.on('filing', filing => {
      
      if(filing.formType === '8-K' && this.props.isAuthenticated && filing.description.includes(flter_item)){
        this.props.addFilingUpdate(filing)

        notification.info({
          message: `New Filing`,
          description: filing.description,
          placement: "bottomLeft"
        });
      }
    });
  }

  async searchsecFilings() {
    this.setState({ loading: true });
    try {
      await this.props.searchSECByQuery(this.state.query);
      this.setState({ loading: false });
    } catch(err) {
      // Handle auth error
      this.setState({ loading: false });
    }
  }

  getSearchKey(keys) {
    let that = this
    let newQuery = Object.assign({}, this.state.query)

    if(keys.clear) {
      newQuery = INITIAL_QUERY
    } else {

      if(keys.entityName) 
        newQuery.entityName = keys.entityName
      else delete newQuery['entityName']

      if(keys.q){
        newQuery.q = keys.q
      } else delete newQuery['q']

      if(keys.daterange) {
        newQuery.startdt = keys.daterange[0]?keys.daterange[0].format('YYYY-MM-DD'):"2000-01-01"
        newQuery.enddt = keys.daterange[1]?keys.daterange[1].format('YYYY-MM-DD'):moment(new Date()).format('YYYY-MM-DD')
      } 

    }

    this.setState({
      query: newQuery
    }, async () => {
      await this.searchsecFilings()
    })
  }

  onCardConfirm(data) {
    this.props.upgradePayment(data)
  }

  handleTableChange(page) {
    this.setState({
      pagination: {current: page},
      query: {
        ...this.state.query,
        "from": (page-1)*100,
        "page": page
      }
    }, async () => {
      await this.searchsecFilings()
    })
  }

  render() {
    const {loading, pagination} = this.state
    const {secFilings, expired} = this.props

    console.log(secFilings)

    return (
      <div className="container-fluid dashboard-page mb-5">
        {
          expired?
            <div
              className="w-100 p-0 my-4 mx-auto"
              style={{maxWidth: 800}}
            >
              <div>
                <img src={subscribeImg} className="mb-3 mx-auto d-sm-none w-100" style={{maxWidth: 200}}/>
              </div>
              <div className="d-flex align-items-center justify-content-center flex-row">
                <img src={subscribeImg} className="mb-3 d-none d-sm-block w-100" style={{maxWidth: 300}}/>
                <div className="mx-3 text-left">
                  <h2 style={{color: '#8BD8BD'}}>Find More and RelevantPublic Company Talent</h2>
                  
                  <h1 style={{color: '#273773'}} className="mb-4">
                    $50 <small style={{fontSize: 15}}>/ per month</small>
                  </h1>
                  <StripeCheckout 
                    onCardConfirm={data => this.onCardConfirm(data)}/>
                  <p className="text-muted mt-3">Payment will be done via Stripe</p>
                </div>
              </div>
            </div>
            :
            <>
              <Row className="mb-4">
                <Col lg={24}>
                  <div className="w-100 text-center px-3">
                    <div className="bg-primary pt-4 banner pb-5">
                      <h3 className="text-white text-center">Find Public Company Talent</h3>
                    </div>
                    <div className="text-center px-3">
                      <Input icon="search" onKeyPress={(e) => {
                        if((e.keyCode ? e.keyCode : e.which) === 13)
                          this.getSearchKey({q: e.target.value})
                      }} prefix={<Icon type="search" className="mx-4" style={{fontSize: 20, fontWeight: "bold", color: '#273773'}}/>} className="header-search" placeholder="Search..."/>
                    </div>
                  </div>
                </Col>
              </Row>
              <div className="mx-auto" style={{maxWidth: 1300}}> 
                <Row gutter={50} className="px-3">
                  <Col lg={6}>
                    <div
                      className="w-100 mb-4 pt-0"
                      style={{border: 'none'}}
                    >
                      <p><b>Search & Filter</b></p>
                      <FilterForm 
                        callback={
                          (keys) => this.getSearchKey(keys)
                        }
                      />
                    </div>
                  </Col>
                  <Col lg={18}>
                    <CompanyTable 
                      loading={loading}
                      searchWord={this.state.query.q}
                      dataSource={secFilings && secFilings.hits.hits}
                      pagination={{
                        ...pagination, 
                        total: secFilings && secFilings.hits.total.value || 100
                      }}
                      onChange={this.handleTableChange}
                    />
                  </Col>
                </Row>
              </div>
            </>
        }
      </div>
    );
  }
}


const mapStateToProps = state => ({
  secFilings: state.sec.secData,
  expired: state.auth.expired,
  isAuthenticated: state.auth.isAuthenticated
});

const mapDispatchToProps = dispatch => bindActionCreators({
  searchSECByQuery,
  upgradePayment,
  addFilingUpdate
}, dispatch);


export default connect(mapStateToProps, mapDispatchToProps)(Dashboard)