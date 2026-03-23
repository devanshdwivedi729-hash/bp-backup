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

const S = {
    paper: {
        borderRadius: '12px',
        overflow: 'hidden',
        maxWidth: '655px',
        width: '100%',
        margin: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    },

    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '56px',
        padding: '16px',
        backgroundColor: '#FAFAFA',
        boxSizing: 'border-box',
        opacity: 1,
    },
    headerTitle: {
        fontSize: '16px',
        fontWeight: '600',
        letterSpacing: '0%',
        color: '#2F2F2F',
        margin: 0,
        fontFamily: 'Montserrat',
    },

    /* Close × button */
    closeBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#505050',
        fontSize: '20px',
        lineHeight: 1,
        padding: '4px',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s ease, color 0.15s ease',
    },
    closeBtnHover: {
        background: '#F0F0F0',
        color: '#111111',
    },

    /* Cannot-delete body */
    body: {
        backgroundColor: '#ffffff',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px',
    },

    /* Can-delete body */
    bodyDelete: {
        backgroundColor: '#ffffff',
        padding: '24px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
    },

    iconWrap: {
        width: '56px',
        height: '56px',
        borderRadius: '6px',
        backgroundColor: '#FFEBEB',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },

    mainTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#2F2F2F',
        margin: 0,
        textAlign: 'center',
        lineHeight: '100%',
        fontFamily: 'Montserrat',
    },

    subText: {
        fontSize: '12px',
        color: '#505050',
        fontWeight: '400',
        margin: 0,
        textAlign: 'center',
        lineHeight: '160%',
        fontFamily: 'Montserrat',
    },

    depCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        overflow: 'hidden',
        marginTop: '8px',
    },
    depCardHeader: {
        padding: '12px',
        fontSize: '12px',
        fontWeight: '700',
        color: '#2f2f2f',
        borderBottom: '1px solid #E6E6E6',
        backgroundColor: '#FAFAFA',
    },
    depCardBody: {
        maxHeight: '300px',
        overflowY: 'auto',
    },
    depRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '8px 12px',
        borderBottom: '1px solid #f3f4f6',
        backgroundColor: '#ffffff',
    },
    depRowLast: {
        borderBottom: 'none',
    },
    depIconBadge: {
        width: '30px',
        height: '30px',
        borderRadius: '4px',
        backgroundColor: '#F5FAFF',
        border: '1px solid #DFEDFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    depItemName: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#2F2F2F',
        margin: 0,
    },

    /* Textarea input block */
    inputWrap: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: 'flex-start',
    },
    inputLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#2f2f2f',
        margin: 0,
        fontFamily: 'Montserrat',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
    },
    inputAsterisk: {
        color: '#E53737',
        fontSize: '12px',
    },
    textarea: {
        width: '100%',
        minHeight: '140px',
        border: '1px solid #A7AABE',
        borderRadius: '6px',
        padding: '12px 14px',
        fontSize: '13px',
        color: '#2f2f2f',
        resize: 'vertical',
        fontFamily: 'Montserrat, inherit',
        outline: 'none',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        lineHeight: '1.5',
    },
    inputError: {
        fontSize: '11px',
        color: '#E53737',
        margin: 0,
        fontFamily: 'Montserrat',
    },

    /* Amber info strip */
    infoStrip: {
        width: '85%',
        backgroundColor: '#FCF6E1',
        marginTop: '20px',
        borderRadius: '8px',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    infoStripText: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#784900',
        margin: 0,
        fontFamily: 'Montserrat',
    },

    /* Footer */
    footer: {
        backgroundColor: '#ffffff',
        padding: '16px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '12px',
        borderTop: '1px solid #F4F4F4',
    },

    /* CLOSE button (cannot-delete dialog) */
    closeTextBtn: {
        fontFamily: 'Montserrat',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        color: '#2f2f2f',
        padding: '8px 16px',
        borderRadius: '6px',
        transition: 'background 0.15s ease, color 0.15s ease',
    },
    closeTextBtnHover: {
        background: '#e5e2e2ff',
    },

    /* CANCEL button (can-delete dialog) */
    cancelBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '700',
        letterSpacing: '0.05em',
        color: '#2f2f2f',
        padding: '10px 16px',
        fontFamily: 'Montserrat',
        borderRadius: '6px',
        transition: 'background 0.15s ease, color 0.15s ease',
    },
    cancelBtnHover: {
        background: '#F0F0F0',
        color: '#111111',
    },

    /* YES, DELETE button */
    deleteBtn: {
        background: '#E53737',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '0%',
        color: '#ffffff',
        padding: '10px 24px',
        fontFamily: 'Montserrat',
        transition: 'background 0.15s ease',
    },
    deleteBtnHover: {
        background: '#C42B2B',
    },

    forceDeleteBtn: {
        background: '#fff7ed',
        border: '1px solid #f97316',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        color: '#c2410c',
        padding: '10px 20px',
        fontFamily: 'Montserrat',
    },
};

function DependencyList({ dependencies }) {
    if (!dependencies || Object.keys(dependencies).length === 0) return null;

    return (
        <>
            {Object.keys(dependencies).map((depKey) => {
                const items = dependencies[depKey];
                const hasNames = items && items.length > 0 && items[0]?.name;
                const count = items ? items.length : 0;

                return (
                    <div key={depKey} style={S.depCard}>
                        <div style={S.depCardHeader}>
                            {depKey}{count > 0 ? ` (${count})` : ''}
                        </div>
                        <div style={S.depCardBody}>
                            {hasNames
                                ? items.map((dep, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            ...S.depRow,
                                            ...(idx === items.length - 1 ? S.depRowLast : {}),
                                        }}
                                    >
                                        <div style={S.depIconBadge}>
                                            <i
                                                className="ri-settings-4-line"
                                                style={{ fontSize: '15px', color: '#0086FF' }}
                                            ></i>
                                        </div>
                                        <p style={S.depItemName}>{dep.name}</p>
                                    </div>
                                ))
                                : items && (
                                    <div style={{ ...S.depRow, ...S.depRowLast }}>
                                        <p style={S.depItemName}>{count} item(s)</p>
                                    </div>
                                )}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export default function Delete({ skeleton, force_delete_enable = false, ...props }) {
    const [open, setOpen] = React.useState(false);
    const { showSnackbar } = useCustomSnackbar();
    const [fullWidth] = React.useState(true);
    const [maxWidth] = React.useState('sm');
    const api_link = props.api_link;
    const data = props.data;

    const refresh = props.refresh ? props.refresh : () => { };
    const varient = props.varient;
    const config_status = props.config_status;
    const isCdDeleteInProgress = props.isCdDeleteInProgress;
    const setCdDeleteInProgress = props.setCdDeleteInProgress;
    const is_edit_permitted = props.is_edit_permited;
    const fromLocalStorage = props.fromLocalStorage ? props.fromLocalStorage : null;
    const customName = props.customName || null;

    const [state, setState] = useState({
        data: { remarks: '' },
        dependency_data: {},
        deleteError: null,
        error: { remarks: '' },
        delete_mark: props.delete_mark,
    });

    const [showLoading, setShowLoading] = useState(false);

    // Hover states
    const [closeBtnHovered, setCloseBtnHovered] = useState(false);
    const [closeTextBtnHovered, setCloseTextBtnHovered] = useState(false);
    const [cancelBtnHovered, setCancelBtnHovered] = useState(false);
    const [deleteBtnHovered, setDeleteBtnHovered] = useState(false);

    function fetchDependencies() {
        PostData(
            GenerateURL({}, properties.api.delete_url),
            props.data,
            onFetchSuccess,
            () => setShowLoading(false),
            true
        );
        setShowLoading(true);
    }

    function onFetchSuccess(data) {
        setState((new_state) => ({ ...new_state, dependency_data: data }));
        setShowLoading(false);
    }

    const handleClickOpen = (e) => {
        fetchDependencies();
        setOpen(true);
    };

    const handleClose = () => {
        if (props.onCloseParentMenu) props.onCloseParentMenu();
        setOpen(false);
    };

    const onDeleteRequest = (force_delete = false) => {
        if (state.data.remarks === '' && state.dependency_data.delete_possible) {
            setState((prev) => ({
                ...prev,
                error: { remarks: 'Please provide a reason for deletion to proceed.' },
            }));
        } else {
            let delete_url;
            setShowLoading(true);
            delete_url = GenerateSearchURL({ remark: state.data.remarks }, api_link);

            if (config_status) {
                delete_url = GenerateSearchURL(
                    { remark: state.data.remarks + '&status=' + config_status },
                    api_link
                );
            }
            if (force_delete) {
                delete_url = GenerateSearchURL({ force_delete: true }, delete_url);
            }

            if (fromLocalStorage) {
                let localStorageValue = JSON.parse(localStorage.getItem(fromLocalStorage.toString()));
                let type = typeof localStorageValue;
                if (type === 'object') {
                    if (localStorageValue && localStorageValue.id === data.entity_id) {
                        localStorage.removeItem(fromLocalStorage.toString());
                    }
                } else {
                    let updatedLocalStorageValue = Array.isArray(localStorageValue)
                        ? localStorageValue.filter((value) => value !== data.entity_id)
                        : localStorageValue;
                    localStorage.setItem(fromLocalStorage.toString(), JSON.stringify(updatedLocalStorageValue));
                }
            }

            setCdDeleteInProgress && setCdDeleteInProgress();
            showSnackbar(
                'info',
                `Deleting ${data?.label || 'entity'} ${props.display_data_name ? ': ' + props.display_data_name : ''}`
            );
            DeleteData(delete_url, data, handleDeleteSuccess, handleSaveFailure, true);
        }
    };

    function handleDeleteSuccess(response) {
        setCdDeleteInProgress && setCdDeleteInProgress();
        showSnackbar(
            'success',
            `${props.display_data_name ? props.display_data_name : data?.label || 'entity'} deleted successfully`
        );
        if (response.deleted) {
            setState((new_state) => ({ ...new_state, delete_mark: true }));
            setTimeout(() => { handleClose(); refresh(response); }, 200);
        }
        if (response.status === 'Success') {
            setState((new_state) => ({ ...new_state, delete_mark: true }));
            setTimeout(() => { handleClose(); refresh(); }, 200);
        } else {
            setState((prev) => ({ ...prev, error: { remarks: response.detail } }));
        }
        setTimeout(() => setShowLoading(false), 400);
    }

    function handleSaveFailure(response) {
        showSnackbar('error', `Unable to delete ${props.display_data_name ? props.display_data_name : ''}`);
        if (response && !response.delete && response.detail) {
            setState((prevState) => ({ ...prevState, error: { remarks: response.detail } }));
        }
        setTimeout(() => setShowLoading(false), 400);
    }

    function onChangeHandler(event) {
        const key = event.target.name;
        const value = event.target.value;
        setState((new_state) => ({
            ...new_state,
            data: { ...new_state.data, [key]: value },
            error: { ...new_state.error, [key]: '' },
        }));
    }

    console.log(props.data.name === 'virtual_group_name', 'props.data.name in delete component');
    console.log('dskjkjsd', state);

    if (skeleton) {
        return <GenericSkeleton variant={'rect'} width={50} height={20} />;
    }

    const entityLabel =
        props.data.name === 'component'
            ? 'service'
            : props.data.name === 'virtual_group_name'
                ? 'virtual group'
                : props.data.name === 'add_virtual_machine'
                    ? 'add virtual'
                    : props.data.name.replaceAll('_', ' ');

    const depCount = state.dependency_data.dependencies
        ? Object.keys(state.dependency_data.dependencies).length
        : 0;

    /* ══════════════════════════════════════
       DIALOG: cannot delete
    ══════════════════════════════════════ */
    const CannotDeleteDialog = (
        <Dialog
            fullWidth={fullWidth}
            maxWidth={maxWidth}
            open={open}
            onClose={handleClose}
            PaperProps={{ style: S.paper }}
        >
            <div style={S.header}>
                <span style={S.headerTitle}>CAUTION</span>
                <button
                    style={{ ...S.closeBtn, ...(closeBtnHovered ? S.closeBtnHover : {}) }}
                    onClick={handleClose}
                    aria-label="Close"
                    onMouseEnter={() => setCloseBtnHovered(true)}
                    onMouseLeave={() => setCloseBtnHovered(false)}
                >
                    <span className='ri-close-line'></span>
                </button>
            </div>

            <div style={S.body}>
                <div style={S.iconWrap}>
                    <span className="ri-alert-fill" style={{ fontSize: '32px', color: '#E53737' }}></span>
                </div>
                <p style={S.mainTitle}>You can not perform delete</p>

                <p style={S.subText}>
                    You can not perform delete
                    {props.display_data_name
                        ? <> for &ldquo;<strong style={{ color: '#2f2f2f' }}>{props.display_data_name}</strong>&rdquo; {entityLabel}</>
                        : <> for this {entityLabel}</>
                    } because it has dependencies
                </p>

                {showLoading && <Loading varient="light" />}

                <DependencyList dependencies={state.dependency_data.dependencies} />
            </div>

            <div style={S.footer}>
                <button
                    style={{ ...S.closeTextBtn, ...(closeTextBtnHovered ? S.closeTextBtnHover : {}) }}
                    onClick={handleClose}
                    onMouseEnter={() => setCloseTextBtnHovered(true)}
                    onMouseLeave={() => setCloseTextBtnHovered(false)}
                >
                    CLOSE
                </button>
            </div>
        </Dialog>
    );

    /* ══════════════════════════════════════
       DIALOG: can delete
    ══════════════════════════════════════ */
    const CanDeleteDialog = (
        <Dialog
            fullWidth={fullWidth}
            maxWidth={maxWidth}
            open={open}
            onClose={handleClose}
            PaperProps={{ style: S.paper }}
        >
            {/* Header */}
            <div style={S.header}>
                <span style={S.headerTitle}>CAUTION</span>
                <button
                    style={{ ...S.closeBtn, ...(closeBtnHovered ? S.closeBtnHover : {}) }}
                    onClick={handleClose}
                    aria-label="Close"
                    onMouseEnter={() => setCloseBtnHovered(true)}
                    onMouseLeave={() => setCloseBtnHovered(false)}
                >
                    <span className='ri-close-line'></span>
                </button>
            </div>

            {/* Body */}
            <div style={S.bodyDelete}>
                <div style={S.iconWrap}>
                    <span className="ri-alert-fill" style={{ fontSize: '32px', color: '#E53737' }}></span>
                </div>

                <p style={S.mainTitle}>Are you sure you want to delete?</p>

                <p style={S.subText}>
                    {props.display_data_name
                        ? <>You are about to delete &ldquo;<strong style={{ color: '#2f2f2f', fontWeight: '600' }}>{props.display_data_name}</strong>&rdquo; {entityLabel}. This action cannot be undone.</>
                        : <>You are about to delete this {entityLabel}. This action cannot be undone.</>
                    }
                </p>

                {depCount > 0 && (
                    <p style={{ ...S.subText, color: '#E53737' }}>
                        Deleting this will also remove the following dependencies.
                    </p>
                )}

                {showLoading && <Loading varient="light" />}

                <DependencyList dependencies={state.dependency_data.dependencies} />

                {props.variant === 'hpa_delete' && props.default_hpa && (
                    <AlertStrip variant="info" dismissible={false} message="Default HPA cannot be deleted" extraClasses="" />
                )}

                {!props.default_hpa && (
                    <div style={S.inputWrap}>
                        <p style={S.inputLabel}>
                            Reason to delete<span style={S.inputAsterisk}>*</span>
                        </p>
                        <textarea
                            style={S.textarea}
                            placeholder="Descriptions"
                            name="remarks"
                            value={state.data.remarks}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={onChangeHandler}
                        />
                        {state.error.remarks ? (
                            <p style={S.inputError}>{state.error.remarks}</p>
                        ) : null}
                    </div>
                )}

                {!showLoading &&
                    typeof state?.dependency_data?.message === 'string' &&
                    state.dependency_data.message.trim() !== '' && (
                        <div style={S.infoStrip}>
                            <span
                                className="ri-information-line"
                                style={{ fontSize: '16px', color: '#92630A', flexShrink: 0 }}
                            ></span>
                            <p style={S.infoStripText}>{state.dependency_data.message}</p>
                        </div>
                    )}
            </div>

            {/* Footer */}
            <div style={S.footer}>
                <button
                    style={{ ...S.cancelBtn, ...(cancelBtnHovered ? S.cancelBtnHover : {}) }}
                    onClick={handleClose}
                    onMouseEnter={() => setCancelBtnHovered(true)}
                    onMouseLeave={() => setCancelBtnHovered(false)}
                >
                    CANCEL
                </button>
                {!props.default_hpa && (
                    force_delete_enable ? (
                        <>
                            <Button
                                style={{ ...S.deleteBtn, ...(deleteBtnHovered ? S.deleteBtnHover : {}) }}
                                isLoading={showLoading}
                                onClick={() => onDeleteRequest()}
                                onMouseEnter={() => setDeleteBtnHovered(true)}
                                onMouseLeave={() => setDeleteBtnHovered(false)}
                            >
                                YES, DELETE
                            </Button>
                            <Button style={S.forceDeleteBtn} isLoading={showLoading} onClick={() => onDeleteRequest(true)}>
                                <span className="ri-delete-bin-7-line" style={{ fontSize: '12px' }}></span> Force Delete
                            </Button>
                        </>
                    ) : (
                        <Button
                            style={{ ...S.deleteBtn, ...(deleteBtnHovered ? S.deleteBtnHover : {}) }}
                            isLoading={showLoading}
                            onClick={() => onDeleteRequest()}
                            onMouseEnter={() => setDeleteBtnHovered(true)}
                            onMouseLeave={() => setDeleteBtnHovered(false)}
                        >
                            YES, DELETE
                        </Button>
                    )
                )}
            </div>
        </Dialog>
    );

    /* ══════════════════════════════════════
       TRIGGER BUTTONS — all variants fully preserved
    ══════════════════════════════════════ */

    if (state.dependency_data.delete_possible) {
        return (
            <React.Fragment>
                {(() => {
                    if (varient === 'Button') return <button className="btn btn-danger" onClick={handleClickOpen}><i className="ri-delete-bin-line"></i>&nbsp;Delete</button>;
                    if (varient === 'RoundIconButton') return <button className="btn btn-transparent btn-with-icon btn-round" onClick={handleClickOpen}><i className="ri-delete-bin-line" style={{ color: '#ff8969' }}></i></button>;
                    if (varient === 'IconButton') return <button className="btn btn-transparent btn-icon-group btn-remixicon" onClick={handleClickOpen}><i className={`ri-delete-bin-line ${props.fontSize}`} style={{ color: '#ff8969' }}></i></button>;
                    if (varient === 'serviceCard') return <button className="btn btn-transparent btn-remixicon" onClick={handleClickOpen}><i className={`ri-delete-bin-line ${props.fontSize}`} style={{ color: '#0787e1' }}></i></button>;
                    if (varient === 'OnlyIcon') return <button className="btn btn-round-v2" onClick={handleClickOpen}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969' }}></i></button>;
                    if (varient === 'new_button') return <button className="icon-btn-v1 icon-btn-outline-danger" onClick={handleClickOpen}><span className="ri-delete-bin-7-line"></span></button>;
                    if (varient === 'env_delete') return <button className="icon-btn-v1 icon-btn-outline-danger" onClick={handleClickOpen}><span className="ri-delete-bin-7-line"></span></button>;
                    if (varient === 'DeleteEnv') return <span role="button" onKeyDown={() => { }} tabIndex={0} className="text-anchor-blue" onClick={handleClickOpen}><span className="mr-10"><i className="ri-delete-bin-line font-16" style={{ color: '#ff4747' }}></i></span>Delete Environment</span>;
                    if (varient === 'hollowDelete') return <button onClick={handleClickOpen} className="btn-hollow btn-hollow-delete"><img src="/images/action_icons/hollow-delete.png" alt="delete" /></button>;
                    if (varient === 'new_ui') return <div onClick={handleClickOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }} className="d-flex text-anchor-blue cursor-pointer"><span className="d-flex align-center" style={{ gap: '7px' }}><span className="ri-file-history-line color-secondary"></span><span className="font-12 font-weight-500 color-secondary" style={{ marginRight: '7px' }}>Delete</span></span></div>;
                    if (varient === 'new_ui_versioning') return <div onClick={handleClickOpen} className="d-flex text-anchor-blue cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><span className="d-flex align-center rp-delete" style={{ gap: '7px' }}><span className="ri-delete-bin-7-line" style={{ color: '#505050' }}></span><span className="rp-delete" style={{ marginRight: '7px', color: '#505050', fontSize: '12px', fontWeight: '500' }}>Delete</span></span></div>;
                    if (varient === 'rp_delete') return <div onClick={(e) => { e.stopPropagation(); handleClickOpen(e); }} className="d-flex text-anchor-blue cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><span className="d-flex align-center" style={{ gap: '7px' }}><span className="ri-delete-bin-7-line" style={{ color: '#505050' }}></span><span style={{ marginRight: '7px', color: '#505050', fontSize: '12px', fontWeight: '500' }}>{`Delete ${customName || ''}`}</span></span></div>;
                    if (varient === 'pipeline-card') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969', marginRight: '4px' }}></i>&nbsp;<span style={{ fontSize: '14px', cursor: 'pointer' }}>Delete Pipeline</span></div>;
                    if (varient === 'service-summary') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969', marginRight: '4px' }}></i>&nbsp;<span style={{ fontSize: '14px', cursor: 'pointer' }}>Delete Service</span></div>;
                    if (varient === 'service-summary-env') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969', marginRight: '4px' }}></i>&nbsp;<span style={{ fontSize: '14px', cursor: 'pointer' }}>Delete Environment</span></div>;
                    if (varient === 'newUI') return <button className="btn btn-icon-outline btn-icon-outline-danger" onClick={handleClickOpen}><span className="font-20 ri-delete-bin-7-line"></span></button>;
                    if (varient === 'rp_config_delete') return <button onClick={handleClickOpen} className="btn mr-0" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><span className="ri-delete-bin-7-line font-20 color-tertiary"></span></button>;
                    return <button className="btn btn-transparent" onClick={handleClickOpen}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969' }}></i>&nbsp;Delete</button>;
                })()}
                {CanDeleteDialog}
            </React.Fragment>
        );
    }

    return (
        <React.Fragment>
            {(() => {
                if (varient === 'Button') return <button className="btn btn-danger" onClick={handleClickOpen}><i className="ri-delete-bin-line"></i>&nbsp;Delete</button>;
                if (varient === 'RoundIconButton') return is_edit_permitted
                    ? <button className="btn btn-transparent btn-with-icon btn-round" onClick={handleClickOpen}><i className="ri-delete-bin-line" style={{ color: '#ff8969' }}></i></button>
                    : <Tooltip title="You are not allowed to perform this action"><button className="btn btn-transparent btn-with-icon btn-round"><i className="ri-delete-bin-line" style={{ color: '#ff8969' }}></i></button></Tooltip>;
                if (varient === 'IconButton') return <button className="btn btn-transparent btn-icon-group btn-remixicon" onClick={handleClickOpen} style={{ border: '1px solid transparent' }}><i className={`ri-delete-bin-line font-16 ${props.fontSize}`} style={{ color: '#ff8969' }}></i></button>;
                if (varient === 'serviceCard') return <button className="btn btn-transparent btn-remixicon" onClick={handleClickOpen}><i className={`ri-delete-bin-line ${props.fontSize}`} style={{ color: '#0787e1' }}></i></button>;
                if (varient === 'OnlyIcon') return <Tooltip title={isCdDeleteInProgress ? 'Delete is in progress' : ''}><button className="btn btn-round-v2" onClick={handleClickOpen} disabled={isCdDeleteInProgress}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969' }}></i></button></Tooltip>;
                if (varient === 'new_button') return <button className="icon-btn-v1 icon-btn-outline-danger" onClick={handleClickOpen}><span className="ri-delete-bin-7-line"></span></button>;
                if (varient === 'env_delete') return is_edit_permitted
                    ? <button className="icon-btn-v1 icon-btn-outline-danger" onClick={handleClickOpen}><span className="ri-delete-bin-7-line"></span></button>
                    : <Tooltip title="You are not allowed to perform this action" arrow><button className="icon-btn-v1 icon-btn-outline-danger" disabled><span className="ri-delete-bin-7-line" style={{ color: '#818078' }}></span></button></Tooltip>;
                if (varient === 'DeleteEnv') return <span role="button" tabIndex={0} onKeyDown={() => { }} className="text-anchor-blue" onClick={handleClickOpen}><span className="mr-10"><i className="ri-delete-bin-line font-16" style={{ color: '#ff4747' }}></i></span>Delete Environment</span>;
                if (varient === 'hollowDelete') return <button onClick={handleClickOpen} className="btn-hollow btn-hollow-delete"><img src="/images/action_icons/hollow-delete.png" alt="delete" /></button>;
                if (varient === 'onlyIconNew') return <button className="btn btn-transparent" onClick={handleClickOpen}><span className="font-18 ri-delete-bin-7-line color-tertiary" style={{ fontWeight: '500' }}></span></button>;
                if (varient === 'newUI') return <button className="btn btn-icon-outline btn-icon-outline-danger" onClick={handleClickOpen}><span className="font-20 ri-delete-bin-7-line"></span></button>;
                if (varient === 'step') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line" style={{ color: '#ff8969' }}></i>&nbsp;<span style={{ fontSize: '14px' }}>Delete</span></div>;
                if (varient === 'pipeline-card') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} tabIndex={0} role="button" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969', marginRight: '4px' }}></i>&nbsp;<span style={{ fontSize: '14px', cursor: 'pointer' }}>Delete Pipeline</span></div>;
                if (varient === 'service-summary') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969', marginRight: '4px' }}></i>&nbsp;<span style={{ fontSize: '14px', cursor: 'pointer' }}>Delete Service</span></div>;
                if (varient === 'service-summary-env') return <div style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={handleClickOpen} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-16" style={{ color: '#ff8969', marginRight: '4px' }}></i>&nbsp;<span style={{ fontSize: '14px', cursor: 'pointer' }}>Delete Environment</span></div>;
                if (varient === 'new_ui') return <div onClick={handleClickOpen} className="d-flex text-anchor-blue cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><span className="d-flex align-center" style={{ gap: '7px' }}><span className="ri-delete-bin-7-line color-secondary"></span><span className="font-12 font-weight-500 color-secondary" style={{ marginRight: '7px' }}>Delete</span></span></div>;
                if (varient === 'new_ui_versioning') return <div onClick={handleClickOpen} className="d-flex text-anchor-blue cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><span className="d-flex align-center" style={{ gap: '7px' }}><span className="ri-delete-bin-7-line" style={{ color: '#505050' }}></span><span style={{ marginRight: '7px', color: '#505050', fontSize: '12px', fontWeight: '500' }}>Delete</span></span></div>;
                if (varient === 'rp_config_delete') return <button onClick={handleClickOpen} className="btn mr-0"><span className="ri-delete-bin-7-line font-20 color-tertiary"></span></button>;
                if (varient === 'rp_delete') return is_edit_permitted
                    ? <div onClick={(e) => { e.stopPropagation(); handleClickOpen(e); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }} className="d-flex text-anchor-blue cursor-pointer"><span className="d-flex align-center rp-delete" style={{ gap: '7px' }}><span className="ri-delete-bin-7-line" style={{ color: '#505050' }}></span><span className="rp-delete" style={{ marginRight: '7px', color: '#505050', fontSize: '12px', fontWeight: '500' }}>{customName ? `Delete ${customName}` : 'Delete'}</span></span></div>
                    : <Tooltip title="You are not allowed to perform this action" arrow><div className="d-flex text-anchor-blue cursor-pointer" style={{ cursor: 'not-allowed', pointerEvents: 'auto' }}><span className="d-flex align-center" style={{ gap: '7px' }}><span className="ri-delete-bin-7-line" style={{ color: '#505050' }}></span><span style={{ marginRight: '7px', color: '#505050', fontSize: '12px', fontWeight: '500' }}>{`Delete ${customName || ''}`}</span></span></div></Tooltip>;
                if (varient === 'default') return <button className="btn btn-transparent" onClick={handleClickOpen} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClickOpen(); }}><i className="ri-delete-bin-line font-14" style={{ color: '#ff8969' }}></i>&nbsp;Delete</button>;
                return is_edit_permitted
                    ? <button className="btn btn-transparent" onClick={handleClickOpen}><i className="ri-delete-bin-line font-14" style={{ color: '#ff8969' }}></i>&nbsp;Delete</button>
                    : <Tooltip title="You are not allowed to perform this action"><button className="btn btn-transparent"><i className="ri-delete-bin-line" style={{ color: '#ff8969' }}></i>&nbsp;Delete</button></Tooltip>;
            })()}
            {CannotDeleteDialog}
        </React.Fragment>
    );
}

Delete.propTypes = {
    ...PropTypes.objectOf(PropTypes.any),
};
