import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { makeStyles, Dialog, Tooltip, DialogActions, DialogContent, DialogContentText, DialogTitle } from '../ui/index';
import { Input } from '../genericComponents/Input';
import { Loading } from '../../views/utils/Loading';
import { DeleteData, PostData } from '../../util/apiInvoker';
import GenerateURL, { GenerateSearchURL } from '../../util/APIUrlProvider';
import properties from '../../properties/properties';
import AlertStrip from '../AlertStrips';
import GenericSkeleton from './Skeletons/GenericSkeleton';
import { useCustomSnackbar } from '../../contexts/SnackbarContext';
import Button from './Button';

const useStyles = makeStyles((theme) => ({
          form: {
                    display: 'flex',
                    flexDirection: 'column',
                    margin: 'auto',
                    width: 'fit-content',
          },
          formControl: {
                    marginTop: theme.spacing(2),
                    minWidth: 120,
          },
          formControlLabel: {
                    marginTop: theme.spacing(1),
          },
}));

export default function Delete({ skeleton, force_delete_enable = false, ...props }) {

          //const classes = useStyles();
          // const DependenciesDelete = props.DependenciesDelete;
          const [open, setOpen] = React.useState(false);
          const { showSnackbar } = useCustomSnackbar();
          const [fullWidth, setFullWidth] = React.useState(true);
          const [maxWidth, setMaxWidth] = React.useState('sm');
          const api_link = props.api_link;
          const data = props.data;

          const refresh = props.refresh ? props.refresh : () => { }
          const varient = props.varient;
          //const style = props.style;
          const config_status = props.config_status;
          const isCdDeleteInProgress = props.isCdDeleteInProgress;
          const setCdDeleteInProgress = props.setCdDeleteInProgress;
          const is_edit_permitted = props.is_edit_permited;
          const fromLocalStorage = props.fromLocalStorage ? props.fromLocalStorage : null;
          const customName = props.customName || null;

          const [state, setState] = useState({
                    data: {
                              remarks: ""
                    },
                    dependency_data: {

                    },
                    deleteError: null,
                    error: {
                              remarks: ""
                    },
                    delete_mark: props.delete_mark
          })

          const [showLoading, setShowLoading] = useState(false);

          // useEffect(() => {

          // }, [props.data])


          function fetchDependencies() {
                    PostData(GenerateURL({}, properties.api.delete_url), props.data, onFetchSuccess, () => { setShowLoading(false) }, true)
                    setShowLoading(true);
          }

          function onFetchSuccess(data) {
                    setState(new_state => ({
                              ...new_state,
                              dependency_data: data,

                    }));
                    setShowLoading(false);
          }
          const handleClickOpen = (e) => {
                    fetchDependencies();
                    setOpen(true);
          };

          const handleClose = () => {
                    if (props.onCloseParentMenu) {
                              props.onCloseParentMenu();
                    }
                    setOpen(false);
          };

          // const handleMaxWidthChange = (event) => {
          //   setMaxWidth(event.target.value);
          // };

          // const handleFullWidthChange = (event) => {
          //   setFullWidth(event.target.checked);
          // };

          const onDeleteRequest = (force_delete = false) => {
                    if (state.data.remarks == "" && state.dependency_data.delete_possible) {
                              setState(prev => ({
                                        ...prev,
                                        error: {
                                                  remarks: "Please provide a reason for deletion to proceed."
                                        }
                              }))
                    }
                    else {
                              let delete_url;
                              setShowLoading(true);
                              delete_url = GenerateSearchURL({ remark: state.data.remarks }, api_link)

                              if (config_status) {
                                        delete_url = GenerateSearchURL({ remark: state.data.remarks + "&status=" + config_status }, api_link)

                              }
                              if (force_delete) {
                                        delete_url = GenerateSearchURL({ force_delete: true }, delete_url);
                              }

                              if (fromLocalStorage) {
                                        let localStorageValue = JSON.parse(localStorage.getItem(fromLocalStorage.toString()));
                                        let type = typeof localStorageValue;

                                        if (type == 'object') {
                                                  if (localStorageValue && (localStorageValue.id == data.entity_id)) {
                                                            localStorage.removeItem(fromLocalStorage.toString());
                                                  }
                                        } else {
                                                  let updatedLocalStorageValue = Array.isArray(localStorageValue) ? localStorageValue.filter(value => value != data.entity_id) : localStorageValue;
                                                  localStorage.setItem(fromLocalStorage.toString(), JSON.stringify(updatedLocalStorageValue));
                                        }

                              }

                              setCdDeleteInProgress && setCdDeleteInProgress();
                              showSnackbar("info", `Deleting ${data?.label || "entity"} ${props.display_data_name ? ": " + props.display_data_name : ""}`)
                              DeleteData(delete_url, data, handleDeleteSuccess, handleSaveFailure, true)
                    }

          }


          function handleDeleteSuccess(response) {
                    setCdDeleteInProgress && setCdDeleteInProgress();
                    showSnackbar("success", `${props.display_data_name ? props.display_data_name : (data?.label || "entity")} deleted successfully`)
                    if (response.deleted) {
                              setState(new_state => ({
                                        ...new_state,
                                        delete_mark: true
                              }))

                              setTimeout(() => {
                                        // handleCloseDeleteDialogue();
                                        handleClose();
                                        refresh(response);

                              }, 200);
                    }

                    if (response.status == "Success") {

                              setState(new_state => ({
                                        ...new_state,
                                        delete_mark: true
                              }))

                              setTimeout(() => {
                                        // handleCloseDeleteDialogue();
                                        handleClose();
                                        refresh();

                              }, 200);
                    }

                    else {
                              setState(prev => ({
                                        ...prev,
                                        error: {
                                                  remarks: response.detail
                                        }
                              }))
                    }
                    setTimeout(() => {
                              setShowLoading(false);

                    }, 400);
          }
          function handleSaveFailure(response) {
                    showSnackbar("error", `Unable to delete ${props.display_data_name ? props.display_data_name : ""} `)
                    if (response && !response.delete && response.detail) {
                              setState(prevState => ({
                                        ...prevState,
                                        error: {
                                                  remarks: response.detail
                                        }
                              }))
                    }
                    setTimeout(() => {
                              // handleCloseDeleteDialogue();
                              setShowLoading(false);
                    }, 400);
          }
          function onChangeHandler(event) {
                    const key = event.target.name;
                    const value = event.target.value;

                    setState(new_state => ({
                              ...new_state,
                              data: {
                                        ...new_state.data,
                                        [key]: value,
                              },
                              error: {
                                        ...new_state.error,
                                        [key]: "",
                              }
                    }));
          }


          console.log(props.data.name == 'virtual_group_name', "props.data.name in delete component");
          console.log("dskjkjsd", state);
          if (skeleton) {
                    return (
                              <GenericSkeleton variant={"rect"} width={50} height={20} />
                    );
          }
          return (
                    <>
                              {state.dependency_data.delete_possible ?
                                        <React.Fragment>
                                                  {
                                                            varient == "Button" ?
                                                                      <button className="btn btn-danger" onClick={handleClickOpen} >
                                                                                <i className="ri-delete-bin-line"  ></i>&nbsp;Delete
                                                                      </button> :
                                                                      varient == "RoundIconButton" ?
                                                                                <button className="btn btn-transparent btn-with-icon btn-round" onClick={handleClickOpen}>
                                                                                          <i className="ri-delete-bin-line" style={{ color: '#ff8969' }} ></i>

                                                                                </button>
                                                                                :
                                                                                varient == "IconButton" ?
                                                                                          <button className="btn btn-transparent btn-icon-group btn-remixicon" onClick={handleClickOpen}>
                                                                                                    <i className={`ri-delete-bin-line ${props.fontSize}`} style={{ color: '#ff8969' }}   ></i>

                                                                                          </button>
                                                                                          :
                                                                                          varient == "serviceCard" ?
                                                                                                    <button className="btn btn-transparent btn-remixicon" onClick={handleClickOpen}>
                                                                                                              <i className={`ri-delete-bin-line ${props.fontSize}`} style={{ color: '#0787e1' }}   ></i>
                                                                                                    </button>
                                                                                                    :
                                                                                                    varient == "OnlyIcon" ?
                                                                                                              <button className="btn btn-round-v2" onClick={handleClickOpen}  >
                                                                                                                        <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969' }}   ></i>

                                                                                                              </button>
                                                                                                              :
                                                                                                              varient == "new_button" ?
                                                                                                                        <button className='icon-btn-v1 icon-btn-outline-danger' onClick={handleClickOpen}><span className='ri-delete-bin-7-line'></span></button>
                                                                                                                        :
                                                                                                                        varient == "env_delete" ?
                                                                                                                                  <button className='icon-btn-v1 icon-btn-outline-danger' onClick={handleClickOpen}><span className='ri-delete-bin-7-line'></span></button>
                                                                                                                                  :
                                                                                                                                  varient == "DeleteEnv" ?
                                                                                                                                            <span role="button" onKeyDown={() => { }} tabIndex={0} className="text-anchor-blue" onClick={handleClickOpen}> <span className="mr-10">
                                                                                                                                                      <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff4747' }}   ></i>
                                                                                                                                            </span>Delete Environment
                                                                                                                                            </span>
                                                                                                                                            :
                                                                                                                                            varient == "hollowDelete" ?
                                                                                                                                                      <button onClick={handleClickOpen} className="btn-hollow btn-hollow-delete">
                                                                                                                                                                <img src='/images/action_icons/hollow-delete.png' alt='delete' />
                                                                                                                                                      </button>
                                                                                                                                                      :
                                                                                                                                                      varient == "new_ui" ?
                                                                                                                                                                <>
                                                                                                                                                                          <div
                                                                                                                                                                                    onClick={handleClickOpen}
                                                                                                                                                                                    role="button"
                                                                                                                                                                                    tabIndex={0}
                                                                                                                                                                                    onKeyDown={(e) => {
                                                                                                                                                                                              if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                        handleClickOpen();
                                                                                                                                                                                              }
                                                                                                                                                                                    }}
                                                                                                                                                                                    className="d-flex text-anchor-blue cursor-pointer">
                                                                                                                                                                                    <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-file-history-line color-secondary'></span><span className='font-12 font-weight-500 color-secondary ' style={{ marginRight: "7px" }}>{"Delete"}</span></span>
                                                                                                                                                                          </div>
                                                                                                                                                                </>
                                                                                                                                                                :
                                                                                                                                                                varient == "new_ui_versioning" ?
                                                                                                                                                                          <>
                                                                                                                                                                                    <div
                                                                                                                                                                                              onClick={handleClickOpen}
                                                                                                                                                                                              className="d-flex text-anchor-blue cursor-pointer"
                                                                                                                                                                                              role="button"
                                                                                                                                                                                              tabIndex={0}
                                                                                                                                                                                              onKeyDown={(e) => {
                                                                                                                                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                  handleClickOpen();
                                                                                                                                                                                                        }
                                                                                                                                                                                              }}>
                                                                                                                                                                                              <span className='d-flex align-center rp-delete' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span className='rp-delete' style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{"Delete"}</span></span>
                                                                                                                                                                                    </div>
                                                                                                                                                                          </>
                                                                                                                                                                          :
                                                                                                                                                                          varient == "rp_delete" ?
                                                                                                                                                                                    <>
                                                                                                                                                                                              <div
                                                                                                                                                                                                        onClick={(e) => {
                                                                                                                                                                                                                  e.stopPropagation();
                                                                                                                                                                                                                  handleClickOpen(e);

                                                                                                                                                                                                        }}
                                                                                                                                                                                                        className="d-flex text-anchor-blue cursor-pointer"
                                                                                                                                                                                                        role="button"
                                                                                                                                                                                                        tabIndex={0}
                                                                                                                                                                                                        onKeyDown={(e) => {
                                                                                                                                                                                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                            handleClickOpen();
                                                                                                                                                                                                                  }
                                                                                                                                                                                                        }}>
                                                                                                                                                                                                        <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{`Delete ${customName || ''}`}</span></span>
                                                                                                                                                                                              </div>


                                                                                                                                                                                    </> :
                                                                                                                                                                                    varient == "pipeline-card"
                                                                                                                                                                                              ?

                                                                                                                                                                                              <div
                                                                                                                                                                                                        style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                                        onClick={handleClickOpen}
                                                                                                                                                                                                        role="button"
                                                                                                                                                                                                        tabIndex={0}
                                                                                                                                                                                                        onKeyDown={(e) => {
                                                                                                                                                                                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                            handleClickOpen();
                                                                                                                                                                                                                  }
                                                                                                                                                                                                        }}>
                                                                                                                                                                                                        <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969', marginRight: "4px" }} ></i>&nbsp;
                                                                                                                                                                                                        <span style={{ fontSize: '14px', cursor: "pointer" }}>Delete Pipeline</span>
                                                                                                                                                                                              </div>
                                                                                                                                                                                              :
                                                                                                                                                                                              varient == "service-summary" ?
                                                                                                                                                                                                        <div
                                                                                                                                                                                                                  style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                                                  onClick={handleClickOpen}
                                                                                                                                                                                                                  role="button"
                                                                                                                                                                                                                  tabIndex={0}
                                                                                                                                                                                                                  onKeyDown={(e) => {
                                                                                                                                                                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                      handleClickOpen();
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  }}>
                                                                                                                                                                                                                  <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969', marginRight: "4px" }} ></i>&nbsp;
                                                                                                                                                                                                                  <span style={{ fontSize: '14px', cursor: "pointer" }}>Delete Service</span>
                                                                                                                                                                                                        </div> :
                                                                                                                                                                                                        varient == "service-summary-env" ?
                                                                                                                                                                                                                  <div
                                                                                                                                                                                                                            style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                                                            onClick={handleClickOpen}
                                                                                                                                                                                                                            role="button"
                                                                                                                                                                                                                            tabIndex={0}
                                                                                                                                                                                                                            onKeyDown={(e) => {
                                                                                                                                                                                                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                handleClickOpen();
                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                            }}>
                                                                                                                                                                                                                            <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969', marginRight: "4px" }} ></i>&nbsp;
                                                                                                                                                                                                                            <span style={{ fontSize: '14px', cursor: "pointer" }}>Delete Environment</span>
                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                  :
                                                                                                                                                                                                                  varient == "newUI" ?
                                                                                                                                                                                                                            <button className='btn btn-icon-outline btn-icon-outline-danger' onClick={handleClickOpen}>
                                                                                                                                                                                                                                      <span className='font-20 ri-delete-bin-7-line '></span>
                                                                                                                                                                                                                            </button> :
                                                                                                                                                                                                                            varient == "hollowDelete" ?
                                                                                                                                                                                                                                      <button onClick={handleClickOpen} className="btn-hollow btn-hollow-delete">
                                                                                                                                                                                                                                                <img src='/images/action_icons/hollow-delete.png' alt='delete' />
                                                                                                                                                                                                                                      </button>
                                                                                                                                                                                                                                      :
                                                                                                                                                                                                                                      varient === "rp_config_delete" ?
                                                                                                                                                                                                                                                <button
                                                                                                                                                                                                                                                          onClick={handleClickOpen}
                                                                                                                                                                                                                                                          className='btn mr-0'
                                                                                                                                                                                                                                                          tabIndex={0}
                                                                                                                                                                                                                                                          onKeyDown={(e) => {
                                                                                                                                                                                                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                              handleClickOpen();
                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                          }}
                                                                                                                                                                                                                                                ><span className='ri-delete-bin-7-line font-20 color-tertiary'></span></button>
                                                                                                                                                                                                                                                :
                                                                                                                                                                                                                                                <button className="btn btn-transparent" onClick={handleClickOpen}>
                                                                                                                                                                                                                                                          <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969' }} ></i>&nbsp;Delete
                                                                                                                                                                                                                                                </button>
                                                  }
                                                  <Dialog
                                                            fullWidth={fullWidth}
                                                            maxWidth={maxWidth}
                                                            open={open}
                                                            onClose={handleClose}
                                                            aria-labelledby="max-width-dialog-title"
                                                  >
                                                            <div id="max-width-dialog-title" className="text-left">
                                                                      <div className="d-flex  align-center" style={{ margin: '30px auto' }
                                                                      }>
                                                                                <span className="ri-close-circle-fill" style={{ fontSize: '40px', color: '#ff4747', margin: '0px 8px' }}></span>
                                                                                <div className="dialogue-heading">
                                                                                          <div className="mr-5">Are you sure you want to delete&nbsp;

                                                                                                    {
                                                                                                              props.display_data_name ?
                                                                                                                        <> &ldquo;<span className="text-color-dark-gray">{`${props.display_data_name}`}</span>&rdquo;&nbsp;</> : null}
                                                                                                    {props.data.name == "component" ?
                                                                                                              "service" :
                                                                                                              props.data.name == "virtual_group_name" ?
                                                                                                                        "virtual group" :
                                                                                                                        props.data.name == "add_virtual_machine" ?
                                                                                                                                  "add virtual" :

                                                                                                                                  props.data.name.replaceAll('_', ' ')}?</div>
                                                                                </div>
                                                                      </div>{Object.keys(state.dependency_data.dependencies).length > 0 &&
                                                                                <p className="text-red mtb-20 text-center">By deleting this app will also delete the following dependencies.<br />
                                                                                          once deleted it cannot be recoverd
                                                                                </p>}
                                                            </div>
                                                            <DialogContent style={{ borderTop: '1px solid #dedede' }}>
                                                                      <DialogContentText>
                                                                                {
                                                                                          showLoading ? <Loading varient="light" /> : null
                                                                                }
                                                                                {/* <p className="text-red mtb-10"> {+ " dependencies will be deleted"}</p> */}
                                                                                <div>
                                                                                          {state.dependency_data.dependencies ?
                                                                                                    Object.keys(state.dependency_data.dependencies).map(data => (

                                                                                                              <div className="pd-10 card ">
                                                                                                                        <p className="font-12 pd-5 border-bottom">
                                                                                                                                  {data}
                                                                                                                        </p>
                                                                                                                        {state.dependency_data.dependencies[data] ? state.dependency_data.dependencies[data][0].name ?
                                                                                                                                  <div>
                                                                                                                                            {
                                                                                                                                                      state.dependency_data.dependencies[data] ? state.dependency_data.dependencies[data].map((dep, index) => (

                                                                                                                                                                <div className="d-flex space-between align-center font-12 pd-5">
                                                                                                                                                                          {/* <span>ip-{index + 1}</span> */}
                                                                                                                                                                          <p className="">{dep.name ? dep.name : index + 1}</p>
                                                                                                                                                                </div>

                                                                                                                                                      )) : null
                                                                                                                                            }

                                                                                                                                  </div> : state.dependency_data.dependencies[data].length : null
                                                                                                                        }
                                                                                                              </div>


                                                                                                    )) : null
                                                                                          }
                                                                                </div>


                                                                      </DialogContentText>
                                                                      {
                                                                                props.variant == "hpa_delete" ?
                                                                                          <>
                                                                                                    {
                                                                                                              props.default_hpa ?
                                                                                                                        <AlertStrip
                                                                                                                                  variant="info"
                                                                                                                                  dismissible={false}
                                                                                                                                  message={"Default HPA cannot be deleted"}
                                                                                                                                  extraClasses="" />
                                                                                                                        :
                                                                                                                        <>
                                                                                                                        </>
                                                                                                    }

                                                                                          </>
                                                                                          : null
                                                                      }
                                                                      {
                                                                                props.default_hpa ?
                                                                                          <></> :
                                                                                          <Input
                                                                                                    type="text"
                                                                                                    label="Reason to delete?"
                                                                                                    placeholder="Please enter the reason to delete"
                                                                                                    name="remarks"
                                                                                                    data={state.data}
                                                                                                    error={state.error}
                                                                                                    onKeyDown={(e) => e.stopPropagation()}
                                                                                                    onChangeHandler={onChangeHandler}
                                                                                          />
                                                                      }
                                                                      {!showLoading && typeof state?.dependency_data?.message === "string" && state.dependency_data.message.trim() !== "" && (
                                                                                <AlertStrip
                                                                                          variant="info"
                                                                                          dismissible={false}
                                                                                          message={state.dependency_data?.message}
                                                                                          extraClasses="" />
                                                                      )}
                                                            </DialogContent>
                                                            <DialogActions className="justify-flexend" style={{ backgroundColor: '#f9f9f9', justifyContent: 'flex-end!important' }}>
                                                                      <div></div>
                                                                      <div className="d-flex align-center justify-flexend" style={{ gap: '5px' }}>
                                                                                <button className="btn btn-secondary-outline" onClick={handleClose}>
                                                                                          Cancel
                                                                                </button>
                                                                                {

                                                                                          props.default_hpa ?
                                                                                                    <></> :
                                                                                                    force_delete_enable ?
                                                                                                              <>
                                                                                                                        <Button className="btn btn-danger" isLoading={showLoading} onClick={() => onDeleteRequest()}>
                                                                                                                                  <span className='ri-delete-bin-7-line font-12'></span> Delete
                                                                                                                        </Button>
                                                                                                                        <Button className="btn" variant='highlight' isLoading={showLoading} onClick={() => onDeleteRequest(true)}>
                                                                                                                                  <span className='ri-delete-bin-7-line font-12'></span> Force Delete
                                                                                                                        </Button>
                                                                                                              </>
                                                                                                              :
                                                                                                              <Button className="btn btn-danger" isLoading={showLoading} onClick={() => onDeleteRequest()}>
                                                                                                                        Delete
                                                                                                              </Button>

                                                                                }

                                                                      </div>

                                                            </DialogActions>
                                                  </Dialog>
                                        </React.Fragment>
                                        :
                                        <React.Fragment>
                                                  {
                                                            varient == "Button" ?
                                                                      <button className="btn btn-danger" onClick={handleClickOpen} >
                                                                                <i className={`ri-delete-bin-line`}  ></i>&nbsp;Delete
                                                                      </button> :
                                                                      varient == "RoundIconButton" ?
                                                                                is_edit_permitted ?
                                                                                          <button className="btn btn-transparent btn-with-icon btn-round" onClick={handleClickOpen}>
                                                                                                    <i className={`ri-delete-bin-line`} style={{ color: '#ff8969' }} ></i>
                                                                                          </button>
                                                                                          :
                                                                                          <Tooltip title="You are not allowed to perform this action">
                                                                                                    <button className="btn btn-transparent btn-with-icon btn-round">
                                                                                                              <i className={`ri-delete-bin-line`} style={{ color: '#ff8969' }} ></i>
                                                                                                    </button>
                                                                                          </Tooltip>
                                                                                :
                                                                                varient == "IconButton" ?
                                                                                          <button className="btn btn-transparent  btn-icon-group btn-remixicon" onClick={handleClickOpen} style={{ border: '1px solid transparent' }}>
                                                                                                    <i className={`ri-delete-bin-line font-16 ${props.fontSize}`} style={{ color: '#ff8969' }} ></i>
                                                                                          </button>
                                                                                          :
                                                                                          varient == "serviceCard" ?
                                                                                                    <button className="btn btn-transparent btn-remixicon" onClick={handleClickOpen}>
                                                                                                              <i className={`ri-delete-bin-line ${props.fontSize}`} style={{ color: '#0787e1' }} ></i>
                                                                                                    </button>
                                                                                                    :
                                                                                                    varient == "OnlyIcon" ?

                                                                                                              <Tooltip title={isCdDeleteInProgress ? "Delete is in progress" : ""}>
                                                                                                                        <button className="btn btn-round-v2" onClick={handleClickOpen} disabled={isCdDeleteInProgress} >
                                                                                                                                  <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969' }} ></i>
                                                                                                                        </button>
                                                                                                              </Tooltip>
                                                                                                              :
                                                                                                              varient == "new_button" ?
                                                                                                                        <button className='icon-btn-v1 icon-btn-outline-danger' onClick={handleClickOpen}><span className='ri-delete-bin-7-line'></span></button>
                                                                                                                        :
                                                                                                                        varient == "env_delete" ?
                                                                                                                                  is_edit_permitted ?
                                                                                                                                            <button className='icon-btn-v1 icon-btn-outline-danger' onClick={handleClickOpen}><span className='ri-delete-bin-7-line'></span></button>
                                                                                                                                            :
                                                                                                                                            <Tooltip title="You are not allowed to perform this action" arrow>
                                                                                                                                                      <button className='icon-btn-v1 icon-btn-outline-danger' disabled><span className='ri-delete-bin-7-line' style={{ color: '#818078' }}></span></button>
                                                                                                                                            </Tooltip>
                                                                                                                                  :
                                                                                                                                  varient == "DeleteEnv" ?
                                                                                                                                            <span role="button" tabIndex={0} onKeyDown={() => { }} className="text-anchor-blue" onClick={handleClickOpen} > <span className="mr-10">
                                                                                                                                                      <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff4747' }} ></i>
                                                                                                                                            </span>Delete Environment</span>
                                                                                                                                            :
                                                                                                                                            varient == "hollowDelete" ?
                                                                                                                                                      <button onClick={handleClickOpen} className="btn-hollow btn-hollow-delete">
                                                                                                                                                                {/* <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
                          varient == "newUI" ?
                            <button className='btn btn-icon-outline btn-icon-outline-danger' onClick={handleClickOpen}>
                              <span className='font-20 ri-delete-bin-7-line '></span>
                            </button> :
                            varient == "hollowDelete" ?
                              <button onClick={handleClickOpen} className="btn-hollow btn-hollow-delete">
                                {/* <svg xmlns="http://www.w3.org/2000/svg" width="20" height="21" viewBox="0 0 20 21" fill="none">
                                  <path d="M14.1667 5.49935H18.3334V7.16602H16.6667V17.9993C16.6667 18.2204 16.579 18.4323 16.4227 18.5886C16.2664 18.7449 16.0544 18.8327 15.8334 18.8327H4.16675C3.94573 18.8327 3.73377 18.7449 3.57749 18.5886C3.42121 18.4323 3.33341 18.2204 3.33341 17.9993V7.16602H1.66675V5.49935H5.83342V2.99935C5.83342 2.77834 5.92121 2.56637 6.07749 2.41009C6.23377 2.25381 6.44573 2.16602 6.66675 2.16602H13.3334C13.5544 2.16602 13.7664 2.25381 13.9227 2.41009C14.079 2.56637 14.1667 2.77834 14.1667 2.99935V5.49935ZM15.0001 7.16602H5.00008V17.166H15.0001V7.16602ZM7.50008 3.83268V5.49935H12.5001V3.83268H7.50008Z" fill="#C11212"/>
                              </svg> */}
                                                                                                                                                                <img src='/images/action_icons/hollow-delete.png' alt='delete' />
                                                                                                                                                      </button>
                                                                                                                                                      :
                                                                                                                                                      varient == "onlyIconNew" ?
                                                                                                                                                                <button className="btn btn-transparent" onClick={handleClickOpen}>
                                                                                                                                                                          <span className='font-18 ri-delete-bin-7-line color-tertiary' style={{ fontWeight: "500" }}></span>
                                                                                                                                                                </button>
                                                                                                                                                                :
                                                                                                                                                                varient == "newUI" ?
                                                                                                                                                                          <button className='btn btn-icon-outline btn-icon-outline-danger' onClick={handleClickOpen}>
                                                                                                                                                                                    <span className='font-20 ri-delete-bin-7-line '></span>
                                                                                                                                                                          </button>
                                                                                                                                                                          :
                                                                                                                                                                          varient == "step" ?
                                                                                                                                                                                    <div
                                                                                                                                                                                              style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                              onClick={handleClickOpen}
                                                                                                                                                                                              tabIndex={0}
                                                                                                                                                                                              role='button'
                                                                                                                                                                                              onKeyDown={(e) => {
                                                                                                                                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                  handleClickOpen();
                                                                                                                                                                                                        }
                                                                                                                                                                                              }}>
                                                                                                                                                                                              <i className={`ri-delete-bin-line`} style={{ color: '#ff8969' }} ></i>&nbsp;
                                                                                                                                                                                              <span style={{ fontSize: '14px' }}>Delete</span>
                                                                                                                                                                                    </div>
                                                                                                                                                                                    : varient == "pipeline-card"
                                                                                                                                                                                              ?

                                                                                                                                                                                              <div
                                                                                                                                                                                                        style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                                        onClick={handleClickOpen}
                                                                                                                                                                                                        tabIndex={0}
                                                                                                                                                                                                        role='button'
                                                                                                                                                                                                        onKeyDown={(e) => {
                                                                                                                                                                                                                  if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                            handleClickOpen();
                                                                                                                                                                                                                  }
                                                                                                                                                                                                        }}>
                                                                                                                                                                                                        <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969', marginRight: "4px" }} ></i>&nbsp;
                                                                                                                                                                                                        <span style={{ fontSize: '14px', cursor: "pointer" }}>Delete Pipeline</span>
                                                                                                                                                                                              </div> :
                                                                                                                                                                                              varient == "service-summary" ?
                                                                                                                                                                                                        <div
                                                                                                                                                                                                                  style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                                                  onClick={handleClickOpen}
                                                                                                                                                                                                                  role="button"
                                                                                                                                                                                                                  tabIndex={0}
                                                                                                                                                                                                                  onKeyDown={(e) => {
                                                                                                                                                                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                      handleClickOpen();
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                  }}
                                                                                                                                                                                                        >
                                                                                                                                                                                                                  <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969', marginRight: '4px' }} ></i>&nbsp;
                                                                                                                                                                                                                  <span style={{ fontSize: '14px', cursor: "pointer" }}>Delete Service</span>
                                                                                                                                                                                                        </div> :
                                                                                                                                                                                                        varient == "service-summary-env" ?
                                                                                                                                                                                                                  <div
                                                                                                                                                                                                                            style={{ width: "100%", cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                                                                                                                                                                                            onClick={handleClickOpen}
                                                                                                                                                                                                                            role="button"
                                                                                                                                                                                                                            tabIndex={0}
                                                                                                                                                                                                                            onKeyDown={(e) => {
                                                                                                                                                                                                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                handleClickOpen();
                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                            }}>
                                                                                                                                                                                                                            <i className={`ri-delete-bin-line font-16`} style={{ color: '#ff8969', marginRight: '4px' }} ></i>&nbsp;
                                                                                                                                                                                                                            <span style={{ fontSize: '14px', cursor: "pointer" }}>Delete Environment</span>
                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                  :
                                                                                                                                                                                                                  varient == "new_ui" ?
                                                                                                                                                                                                                            <>
                                                                                                                                                                                                                                      <div
                                                                                                                                                                                                                                                onClick={handleClickOpen}
                                                                                                                                                                                                                                                className="d-flex text-anchor-blue cursor-pointer"
                                                                                                                                                                                                                                                role="button"
                                                                                                                                                                                                                                                tabIndex={0}
                                                                                                                                                                                                                                                onKeyDown={(e) => {
                                                                                                                                                                                                                                                          if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                    handleClickOpen();
                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                }}
                                                                                                                                                                                                                                      >
                                                                                                                                                                                                                                                <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line color-secondary'></span><span className='font-12 font-weight-500 color-secondary ' style={{ marginRight: "7px" }}>{"Delete"}</span></span>
                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                            </>
                                                                                                                                                                                                                            :
                                                                                                                                                                                                                            varient == "new_ui_versioning" ?
                                                                                                                                                                                                                                      <>
                                                                                                                                                                                                                                                <div
                                                                                                                                                                                                                                                          onClick={handleClickOpen}
                                                                                                                                                                                                                                                          className="d-flex text-anchor-blue cursor-pointer"
                                                                                                                                                                                                                                                          role="button"
                                                                                                                                                                                                                                                          tabIndex={0}
                                                                                                                                                                                                                                                          onKeyDown={(e) => {
                                                                                                                                                                                                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                              handleClickOpen();
                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                          }}>
                                                                                                                                                                                                                                                          <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{"Delete"}</span></span>
                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                      </> :
                                                                                                                                                                                                                                      varient === "rp_config_delete" ?
                                                                                                                                                                                                                                                <button
                                                                                                                                                                                                                                                          onClick={handleClickOpen}
                                                                                                                                                                                                                                                          className='btn mr-0'
                                                                                                                                                                                                                                                          tabIndex={0}
                                                                                                                                                                                                                                                          onKeyDown={(e) => {
                                                                                                                                                                                                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                              handleClickOpen();
                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                          }}
                                                                                                                                                                                                                                                ><span className='ri-delete-bin-7-line font-20 color-tertiary'></span></button>
                                                                                                                                                                                                                                                :

                                                                                                                                                                                                                                                varient == "rp_delete" ?
                                                                                                                                                                                                                                                          is_edit_permitted ?
                                                                                                                                                                                                                                                                    <>
                                                                                                                                                                                                                                                                              <div onClick={(e) => {
                                                                                                                                                                                                                                                                                        e.stopPropagation();
                                                                                                                                                                                                                                                                                        handleClickOpen(e);
                                                                                                                                                                                                                                                                              }} role="button" tabIndex={0} onKeyDown={(e) => {
                                                                                                                                                                                                                                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                                                  handleClickOpen();
                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                              }} className="d-flex text-anchor-blue cursor-pointer">
                                                                                                                                                                                                                                                                                        <span className='d-flex align-center rp-delete' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span className='rp-delete' style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{customName ? `Delete ${customName}` : "Delete"}</span></span>
                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                    </>
                                                                                                                                                                                                                                                                    :
                                                                                                                                                                                                                                                                    <Tooltip title="You are not allowed to perform this action" arrow>
                                                                                                                                                                                                                                                                              <div className="d-flex text-anchor-blue cursor-pointer" style={{
                                                                                                                                                                                                                                                                                        cursor: "not-allowed",

                                                                                                                                                                                                                                                                                        pointerEvents: "auto",
                                                                                                                                                                                                                                                                              }}>
                                                                                                                                                                                                                                                                                        <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{`Delete ${customName || ''}`}</span></span>
                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                    </Tooltip>

                                                                                                                                                                                                                                                          :
                                                                                                                                                                                                                                                          varient == "rp_delete" ?
                                                                                                                                                                                                                                                                    is_edit_permitted ?
                                                                                                                                                                                                                                                                              <>
                                                                                                                                                                                                                                                                                        <div
                                                                                                                                                                                                                                                                                                  onClick={(e) => {
                                                                                                                                                                                                                                                                                                            e.stopPropagation();
                                                                                                                                                                                                                                                                                                            fetchDependencies();
                                                                                                                                                                                                                                                                                                            setOpen(true);
                                                                                                                                                                                                                                                                                                  }}
                                                                                                                                                                                                                                                                                                  className="d-flex text-anchor-blue cursor-pointer"
                                                                                                                                                                                                                                                                                                  role="button"
                                                                                                                                                                                                                                                                                                  tabIndex={0}
                                                                                                                                                                                                                                                                                                  onKeyDown={(e) => {
                                                                                                                                                                                                                                                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                                                                      e.stopPropagation();
                                                                                                                                                                                                                                                                                                                      fetchDependencies();
                                                                                                                                                                                                                                                                                                                      setOpen(true);
                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                  }}
                                                                                                                                                                                                                                                                                        >
                                                                                                                                                                                                                                                                                                  <span className='d-flex align-center' style={{ gap: "7px", pointerEvents: 'none' }}>
                                                                                                                                                                                                                                                                                                            <span className='ri-delete-bin-7-line' style={{ color: '#505050', pointerEvents: 'none' }}></span>
                                                                                                                                                                                                                                                                                                            <span style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500', pointerEvents: 'none' }}>{"Delete"}</span>
                                                                                                                                                                                                                                                                                                  </span>
                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                              </>
                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                              <Tooltip title="You are not allowed to perform this action" arrow>
                                                                                                                                                                                                                                                                                        <div className="d-flex text-anchor-blue cursor-pointer">
                                                                                                                                                                                                                                                                                                  <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{`Delete ${customName || ''}`}</span></span>
                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                              </Tooltip>

                                                                                                                                                                                                                                                                    :
                                                                                                                                                                                                                                                                    varient === "rp_config_delete" ?
                                                                                                                                                                                                                                                                              <button onClick={handleClickOpen} className='btn mr-0'><span className='ri-delete-bin-7-line font-20 color-tertiary'></span></button>
                                                                                                                                                                                                                                                                              :
                                                                                                                                                                                                                                                                              varient == "default" ?
                                                                                                                                                                                                                                                                                        <button
                                                                                                                                                                                                                                                                                                  className="btn btn-transparent"
                                                                                                                                                                                                                                                                                                  onClick={handleClickOpen}
                                                                                                                                                                                                                                                                                                  tabIndex={0}
                                                                                                                                                                                                                                                                                                  onKeyDown={(e) => {
                                                                                                                                                                                                                                                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                                                                      handleClickOpen();
                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                  }}
                                                                                                                                                                                                                                                                                        >
                                                                                                                                                                                                                                                                                                  <i className={`ri-delete-bin-line font-14`} style={{ color: '#ff8969' }} ></i>&nbsp;Delete
                                                                                                                                                                                                                                                                                        </button>
                                                                                                                                                                                                                                                                                        :
                                                                                                                                                                                                                                                                                        is_edit_permitted ?
                                                                                                                                                                                                                                                                                                  <button className="btn btn-transparent" onClick={handleClickOpen} >
                                                                                                                                                                                                                                                                                                            <i className={`ri-delete-bin-line font-14`} style={{ color: '#ff8969' }} ></i>&nbsp;Delete
                                                                                                                                                                                                                                                                                                  </button>
                                                                                                                                                                                                                                                                                                  :
                                                                                                                                                                                                                                                                                                  varient == "new_ui_versioning" ?
                                                                                                                                                                                                                                                                                                            <>
                                                                                                                                                                                                                                                                                                                      <div
                                                                                                                                                                                                                                                                                                                                onClick={handleClickOpen}
                                                                                                                                                                                                                                                                                                                                className="d-flex text-anchor-blue cursor-pointer"
                                                                                                                                                                                                                                                                                                                                role="button" tabIndex={0}
                                                                                                                                                                                                                                                                                                                                onKeyDown={(e) => {
                                                                                                                                                                                                                                                                                                                                          if (e.key === 'Enter' || e.key === ' ') {
                                                                                                                                                                                                                                                                                                                                                    handleClickOpen();
                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                }}>
                                                                                                                                                                                                                                                                                                                                <span className='d-flex align-center' style={{ gap: "7px" }}><span className='ri-delete-bin-7-line' style={{ color: '#505050' }}></span><span style={{ marginRight: "7px", color: '#505050', fontSize: '12px', fontWeight: '500' }}>{"Delete"}</span></span>
                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                            </>
                                                                                                                                                                                                                                                                                                            :
                                                                                                                                                                                                                                                                                                            <Tooltip title="You are not allowed to perform this action">
                                                                                                                                                                                                                                                                                                                      <button className="btn btn-transparent">
                                                                                                                                                                                                                                                                                                                                <i className={`ri-delete-bin-line`} style={{ color: '#ff8969' }} ></i>&nbsp;Delete
                                                                                                                                                                                                                                                                                                                      </button>
                                                                                                                                                                                                                                                                                                            </Tooltip>
                                                  }


                                                  <Dialog
                                                            fullWidth={fullWidth}
                                                            maxWidth={maxWidth}
                                                            open={open}
                                                            onClose={handleClose}
                                                            aria-labelledby="max-width-dialog-title"
                                                  >
                                                            <DialogTitle style={{ paddingLeft: '0px' }} id="max-width-dialog-title" className="text-left">
                                                                      <div className="d-flex align-center text-center" style={{ marginTop: '30px', flexDirection: 'column' }}>
                                                                                <span className="ri-close-circle-fill" style={{ fontSize: '40px', color: '#ff4747', margin: '0px 8px' }}></span>
                                                                                <div className="dialogue-heading" style={{ flexDirection: 'column' }}>
                                                                                          <div className='mr-5'>You can not perform delete for</div>
                                                                                          <div>{props.display_data_name ? <>&ldquo;</> : null}<span className="text-color-dark-gray">{props.display_data_name}</span>{props.display_data_name ? <>&rdquo;</> : null} {props.data.name.replaceAll('_', ' ')}</div>
                                                                                </div>
                                                                      </div>
                                                                      <p className="text-red mtb-20 ml-10">It has following dependencies which are restricting delete operation.<br />

                                                                      </p>
                                                            </DialogTitle>
                                                            <DialogContent style={{ borderTop: '1px solid #dedede' }}>
                                                                      <DialogContentText>
                                                                                {
                                                                                          showLoading ? <Loading varient="light" /> : null
                                                                                }
                                                                                <p className="text-red mtb-10"> {(state.dependency_data.dependencies ? Object.keys(state.dependency_data.dependencies).length : 0) + " dependencies are there!"}</p>
                                                                                <div>
                                                                                          {state.dependency_data.dependencies ?
                                                                                                    Object.keys(state.dependency_data.dependencies).map(data => (

                                                                                                              <div className="pd-10 card ">
                                                                                                                        <p className="font-12 pd-5 border-bottom">
                                                                                                                                  {data}
                                                                                                                        </p>
                                                                                                                        {state.dependency_data.dependencies[data] ? state.dependency_data.dependencies[data][0].name ?
                                                                                                                                  <div>
                                                                                                                                            {
                                                                                                                                                      state.dependency_data.dependencies[data] ? state.dependency_data.dependencies[data].map((dep, index) => (

                                                                                                                                                                <div className="d-flex space-between align-center font-12 pd-5">
                                                                                                                                                                          {/* <span>ip-{index + 1}</span> */}
                                                                                                                                                                          <p className="">{dep.name ? dep.name : index + 1}</p>
                                                                                                                                                                </div>

                                                                                                                                                      )) : null
                                                                                                                                            }

                                                                                                                                  </div> : state.dependency_data.dependencies[data].length : null
                                                                                                                        }
                                                                                                              </div>


                                                                                                    )) : null
                                                                                          }
                                                                                </div>
                                                                      </DialogContentText>
                                                            </DialogContent>
                                                            <DialogActions className="justify-flexend" style={{ backgroundColor: '#f9f9f9', justifyContent: 'flex-end!important' }}>
                                                                      <div></div>
                                                                      <div className="d-flex align-center justify-flexend" style={{ gap: '5px' }}>
                                                                                <button className="btn btn-secondary-outline" onClick={handleClose}>
                                                                                          Close
                                                                                </button>
                                                                                {/* {
                  props.default_hpa ?
                    <></> : <button className="btn btn-danger cursor-not-allowed" onClick={()=>{}}>
                      Delete
                    </button>
                } */}
                                                                      </div>

                                                            </DialogActions>
                                                  </Dialog>
                                        </React.Fragment >
                              }
                    </>
          );
}

Delete.propTypes = {
          ...PropTypes.objectOf(PropTypes.any),
};
