CREATENEWSTEPCATALOG.JS

import React, { useState, useEffect, useMemo, useRef } from "react";
import PageHeader from "../../../components/PageHeader";
import { safeNavigateBack } from "../../../util/util";
import { Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import AlertStrip from "../../../components/AlertStrips";
import { makeStyles } from "@mui/styles";
import Button from "../../../components/genericComponents/Button";
import { StepWizard } from "../../../components/Step Wizard/StepWizard";
import { CustomWizardFooter } from "../../serviceRevamp/add/cd_flow/CdInfo";
import BasicInfo, { getBasicInfoDefaultState } from "./createStepComponents/BasicInfo";
import Runtime, { getRuntimeDefaultState } from "./createStepComponents/Runtime";
import Mounts, { getMountsDefaultState } from "./createStepComponents/Mounts";
import DataPaths, { getDataPathsDefaultState } from "./createStepComponents/DataPaths";
import StepCatalogInput, { getInputsDefaultState } from "./createStepComponents/StepCatalogInput";
import StepCatalogOutput, { getOutputsDefaultState } from "./createStepComponents/StepCatalogOutput";
import Limit, { getLimitDefaultState } from "./createStepComponents/Limit";
import { Loading } from "../../utils/Loading";
import InvokeApi, { PostData } from "../../../util/apiInvoker";
import GenerateURL from "../../../util/APIUrlProvider";
import properties from "../../../properties/properties";
import { useCustomSnackbar } from "../../../contexts/SnackbarContext";
import { showErrorHandlerUpdated } from "../../../util/util";
import PageError from "../../../components/genericComponents/Errors/PageError";

// ─── Post Data Parser (wizard panel state → API payload) ─────────────────────
function panelFetchDataParser(response) {
  const panels = {};

  // ── Panel 1 — Basic Info ──────────────────────────────────────────────────
  const category_list = [];
  if (response.category?.length > 0) {
    response.category.forEach((el) => category_list.push(el.id));
  }
  panels[1] = {
    ...getBasicInfoDefaultState(),
    data: {
      step_name: response.name || "",
      step_version: response.version || "v2",
      step_code: response.code || "",
      step_description: response.description || "",
      step_categories: category_list,
    },
    error: {},
  };

  // ── Panel 2 — Runtime ─────────────────────────────────────────────────────
  panels[2] = {
    ...getRuntimeDefaultState(),
    data: {
      step_type:
        response.container_type === "Dockerize" ||
          response.image_name_with_tag !== null
          ? "dockerize"
          : "non_dockerize",
      docker_image_with_tag: response.image_name_with_tag || "",
      entry_commands: response.commands?.length ? response.commands : [""],
    },
    error: {},
  };

  // ── Panel 3 — Mounts ──────────────────────────────────────────────────────
  const mountArr = Array.isArray(response.mount_path) ? response.mount_path : [];
  const mountDetails = mountArr.length
    ? mountArr.map((item) => ({
      mount_name: String(item.id),
      mount_source: item.source_path || "",
      mount_destination: item.destination_path || "",
    }))
    : [{ mount_name: "", mount_source: "", mount_destination: "" }];

  const customArr =
    Array.isArray(response.custom_mount_path) && response.custom_mount_path.length
      ? response.custom_mount_path
      : null;
  const customMountPaths = customArr
    ? customArr.map((m) => ({
      mount_source: m.source_path || "",
      mount_destination: m.mount_destination || "",
    }))
    : [{ mount_source: "", mount_destination: "" }];

  panels[3] = {
    ...getMountsDefaultState(),
    data: { mount_details: mountDetails, custom_mount_paths: customMountPaths },
    error: {},
  };

  // ── Panel 4 — Data Paths ──────────────────────────────────────────────────
  const data_requirement_list = [];
  if (response.data_requirement?.length > 0) {
    response.data_requirement.forEach((el) => data_requirement_list.push(el.id));
  }
  panels[4] = {
    ...getDataPathsDefaultState(),
    data: { selected_data_paths: data_requirement_list },
    error: {},
  };

  // ── Panel 5 — Inputs ──────────────────────────────────────────────────────
  const envVarList = Array.isArray(response.environment_variables)
    ? response.environment_variables
    : [];
  const onlyEnvVarList = envVarList.filter((v) => v.input_type);
  const onlyIntegrationVarList = envVarList.filter((v) => !v.input_type && v.integration_type);

  panels[5] = {
    ...getInputsDefaultState(),
    data: {
      environment_variables: onlyEnvVarList.length
        ? onlyEnvVarList.map((v) => ({
          variable_data_type: v.input_type || "",
          variable_name: v.key || "",
          default_value_toggle: v.does_default_active === "Y" ? "yes" : "no",
          default_value: v.default_value || "",
          required: v.is_required ?? false,
          overridable: v.is_trigger_time_modify ?? false,
          step_specific: v.is_only_changeable_at_step ?? false,
        }))
        : getInputsDefaultState().data.environment_variables,
      integration_variables: onlyIntegrationVarList.length
        ? onlyIntegrationVarList.map((v) => ({
          integration_type: v.integration_type != null ? String(v.integration_type) : "",
          integration_code: v.integration || "",
          integration_key: v.integration_key || "",
          required: v.is_required ?? false,
        }))
        : getInputsDefaultState().data.integration_variables,
    },
    error: {},
  };

  // ── Panel 6 — Outputs ─────────────────────────────────────────────────────
  const outputVarList = Array.isArray(response.output_variables)
    ? response.output_variables
    : [];
  const reportEditData = getEditTimeDataForReportType(response.reports_data);

  panels[6] = {
    ...getOutputsDefaultState(),
    data: {
      output_variables: outputVarList.length
        ? outputVarList.map((v) => ({
          output_variable_name: v.name || "",
          description: v.description || "",
        }))
        : getOutputsDefaultState().data.output_variables,
      generate_report: reportEditData.report_enable ?? false,
      select_tool: reportEditData.type || "",
      report_file_name: reportEditData.file_name || "",
    },
    error: {},
  };

  // ── Panel 7 — Limit ───────────────────────────────────────────────────────
  const resourceData = getEditTimeResourceConstraintData(response);
  panels[7] = {
    ...getLimitDefaultState(),
    data: {
      impose_restriction: resourceData.resource_constraint ?? false,
      cpu_limit: resourceData.cpu_limit || "",
      memory_limit: resourceData.mem_limit || "",
    },
    error: {},
  };

  return panels;
}

// ─── Post Data Parser ─────────────────────────────────────────────────────────
function panelPostDataParser(panel_object, isDockerize) {
  const get = (key) => panel_object[key] || null;
  let step_data = {};

  // ── Panel 1 — Basic Info ──────────────────────────────────────────────────
  const p1 = get("1");
  if (p1?.data) {
    const p = p1.data;
    step_data = {
      ...step_data,
      name: p.step_name,
      code: p.step_code,
      description: p.step_description,
      version: p.step_version,
      category: p.step_categories,
      form_json: {},
    };
  }

  // ── Panel 2 — Runtime ─────────────────────────────────────────────────────
  const p2 = get("2");
  if (p2?.data) {
    const p = p2.data;
    step_data = {
      ...step_data,
      container_type: isDockerize ? "Dockerize" : "Non-Dockerize",
      image_name_with_tag: isDockerize ? p.docker_image_with_tag : null,
      commands: p.entry_commands.filter((c) => c?.trim()),
    };
  }

  // ── Panels 3, 4, 5 — Dockerize-only ──────────────────────────────────────
  if (isDockerize) {
    // Panel 3 — Mounts (flat numeric ID array)
    const p3 = get("3");
    if (p3?.data) {
      const p = p3.data;
      step_data = {
        ...step_data,
        mount_path: p.mount_details
          .filter((m) => m.mount_name)
          .map((m) => Number(m.mount_name)),
        custom_mount_path: p.custom_mount_paths
          .filter((m) => m.mount_source?.trim() || m.mount_destination?.trim())
          .map((m) => ({
            source_path: m.mount_source,
            mount_destination: m.mount_destination,
          })),
      };
    }
    

    // Panel 4 — Data Paths
    const p4 = get("4");
    if (p4?.data) {
      step_data = { ...step_data, data_requirement: p4.data.selected_data_paths };
    }

    // Panel 5 — Inputs
    const p5 = get("5");
    if (p5?.data) {
      const p = p5.data;
      const envVars = (p.environment_variables || [])
        .filter((v) => v.variable_data_type || v.variable_name)
        .map((v) => ({
          key: v.variable_name,
          input_type: v.variable_data_type,
          is_required: v.required,
          default_value: v.default_value_toggle === "yes" ? v.default_value || "" : "",
          does_default_active: v.default_value_toggle === "yes" ? "Y" : "N",
          is_trigger_time_modify: !!v.overridable,
          is_only_changeable_at_step: !!v.step_specific,
        }));
      const integrationVars = (p.integration_variables || [])
        .filter((v) => v.integration_type || v.integration_key)
        .map((v) => ({
          integration_type: v.integration_type ? Number(v.integration_type) : null,
          integration: v.integration_code || "",
          integration_key: v.integration_key,
          is_required: v.required,
          does_default_active: "N",
        }));
      step_data = { ...step_data, environment_variables: [...envVars, ...integrationVars] };
    }
  } else {
    // Non-dockerize: send empty arrays so the API clears these fields
   step_data = {
    ...step_data,
    data_requirement: [],
    environment_variables: [],
    mount_path:null,
  };
  }

  // ── Outputs & Limit panels use ORIGINAL keys (6 & 7) regardless of
  //    non-dockerize re-numbering, because panel_object keys come from the
  //    original ALL_PANELS order stored in persistent state.
  const p6 = get("6");
  if (p6?.data) {
    const p = p6.data;
    const outputVars = (p.output_variables || [])
      .filter((v) => v.output_variable_name || v.description)
      .map((v) => ({ name: v.output_variable_name, description: v.description }));
    step_data = {
      ...step_data,
      output_variables: outputVars.length ? outputVars : null,
      reports_data: p.generate_report
        ? { report_enable: true, reports_data: [{ type: p.select_tool, file_name: p.report_file_name }] }
        : {},
    };
  }

  const p7 = get("7");
  if (p7?.data) {
    const p = p7.data;
    step_data = {
      ...step_data,
      cpu_limit: p.impose_restriction ? p.cpu_limit || null : null,
      mem_limit: p.impose_restriction && p.memory_limit ? p.memory_limit + "m" : null,
    };
  }

  return step_data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getEditTimeDataForReportType(data) {
  if (!data) return {};
  const reportTypeAndFile = data.reports_data?.[0];
  return { report_enable: data.report_enable, ...reportTypeAndFile };
}

function getEditTimeResourceConstraintData(data) {
  if (!data?.cpu_limit && !data?.mem_limit) return { resource_constraint: false };
  return {
    resource_constraint: true,
    cpu_limit: data.cpu_limit || "",
    mem_limit: data.mem_limit ? data.mem_limit.replace("m", "") : "",
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
const CreateNewStepCatalogRevamp = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { step_id } = useParams();
  const clone_step_id = location.state?.step_data_id;
  const isEdit = Boolean(step_id);
  const isClone = Boolean(clone_step_id);
  const { showSnackbar } = useCustomSnackbar();

  const [canRedirect, setCanRedirect] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [dataLoading, setDataLoading] = useState(isEdit || isClone);
  const [dataLoadFailure, setDataLoadFailure] = useState(false);
  const [panels, setPanels] = useState(null);

  // ── step_type drives which panels are visible — same pattern as
  //    eventCategory in PipelineNotificationRule ─────────────────────────────
  const [stepType, setStepType] = useState("dockerize");

  // ── selectedTabOrder ref — tracks the wizard's current tab position so we
  //    can restore it when stepType changes and wizardDataJson rebuilds.
  //    We use a ref (not state) because we only need it at the moment of
  //    a stepType toggle; it must not cause extra re-renders itself.
  const selectedTabOrderRef = useRef(1);

  // ── tabRestoreTarget: when non-null, StepWizard's useEffect will pick this
  //    up as prev_state and jump to the specified tab. Reset to null after one
  //    render so we don't keep overriding the wizard's internal navigation.
  const [tabRestoreTarget, setTabRestoreTarget] = useState(null);

  // Call this instead of setStepType directly.
  // 1. Clamp the saved tab to the new panel count (so we never point past the
  //    last step after docker-only panels are removed).
  // 2. Set tabRestoreTarget so StepWizard jumps to the right tab on next render.
  //    We pass ONLY selectedTabOrder — no panels key — so the shallow merge in
  //    StepWizard's useEffect leaves the user's filled-in panel data untouched.
  function handleSetStepType(type) {
    setStepType(type);
    const newPanelCount = type === "dockerize" ? 7 : 4;
    const clamped = Math.min(selectedTabOrderRef.current, newPanelCount);
    setTabRestoreTarget({ selectedTabOrder: clamped });
  }

  // ── Persistent state ref prevents data loss when panels are added/removed ──
  const persistentState = useRef({
    basic: null,
    runtime: null,
    mounts: null,
    dataPaths: null,
    inputs: null,
    outputs: null,
    limit: null,
  });

  const isDockerize = stepType === "dockerize";
  const workflow_name = isEdit ? "Edit Step" : "Create a new step";

  // ── wizardDataJson rebuilds whenever stepType changes — same as useMemo in
  //    PipelineNotificationRule ───────────────────────────────────────────────
  const wizardDataJson = useMemo(() => {
    const steps = [
      { order: 1, mainText: "Basic Info", body: BasicInfo },
      { order: 2, mainText: "Runtime", body: Runtime },
    ];

    let currentOrder = 3;

    // Mounts, Data Paths, Inputs only for Dockerize
    if (isDockerize) {
      steps.push({ order: currentOrder++, mainText: "Mounts", body: Mounts });
      steps.push({ order: currentOrder++, mainText: "Data Paths", body: DataPaths });
      steps.push({ order: currentOrder++, mainText: "Inputs", body: StepCatalogInput });
    }

    steps.push(
      { order: currentOrder++, mainText: "Outputs", body: StepCatalogOutput },
      { order: currentOrder++, mainText: "Resource Limit", body: Limit }
    );

    if (panels) {
      const bodyToPanel = {
        [BasicInfo]: panels[1],
        [Runtime]: panels[2],
        [Mounts]: panels[3],
        [DataPaths]: panels[4],
        [StepCatalogInput]: panels[5],
        [StepCatalogOutput]: panels[6],
        [Limit]: panels[7],
      };
      return steps.map((step) => ({
        ...step,
        prev_state: bodyToPanel[step.body] || undefined,
      }));
    }

    return steps;
  }, [isDockerize, panels]);

  // ── Fetch on edit or clone ────────────────────────────────────────────────
  useEffect(() => {
    if (isEdit || isClone) {
      loadStepData(step_id || clone_step_id);
    }
  }, [step_id, clone_step_id]);

  function loadStepData(id) {
    setDataLoading(true);
    setDataLoadFailure(false);
    const requestInfo = {
      endPoint: GenerateURL({ step_id: id }, properties.api.getStep),
      httpMethod: "GET",
      httpHeaders: { "Content-Type": "application/json" },
    };
    InvokeApi(requestInfo, onFetchSuccess, onFetchFail);
  }

  function onFetchSuccess(response) {
    let parsed = panelFetchDataParser(response);

    if (isClone) {
      parsed[1] = {
        ...parsed[1],
        data: {
          ...parsed[1].data,
          step_name: location.state?.step_name || "",
          step_code: location.state?.step_code || "",
        },
      };
    }

    // Sync stepType from fetched data so wizardDataJson builds correctly
    const fetchedStepType = parsed[2]?.data?.step_type || "dockerize";
    setStepType(fetchedStepType);
    setPanels(parsed);
    setDataLoading(false);
  }

  function onFetchFail(error) {
    setErrorMsg("Error fetching details for the given Step ID " + step_id + ": " + error);
    setDataLoadFailure(true);
    setDataLoading(false);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  // panel_object keys from the wizard are re-numbered (1-N). We need to map
  // them back to the original fixed keys (1-7) so panelPostDataParser works.
  function onSubmit(panel_object) {
    // Build a fixed-key object by walking wizardDataJson order
    const fixedKeyObject = {};
    const bodyToFixedKey = {
      [BasicInfo]: "1",
      [Runtime]: "2",
      [Mounts]: "3",
      [DataPaths]: "4",
      [StepCatalogInput]: "5",
      [StepCatalogOutput]: "6",
      [Limit]: "7",
    };
    wizardDataJson.forEach((step, idx) => {
      const wizardKey = String(idx + 1);
      const fixedKey = bodyToFixedKey[step.body];
      if (fixedKey && panel_object[wizardKey]) {
        fixedKeyObject[fixedKey] = panel_object[wizardKey];
      }
    });

    const step_data = panelPostDataParser(fixedKeyObject, isDockerize);

    let post_url = GenerateURL({}, properties.api.stepCatalogs);
    if (isEdit) post_url = GenerateURL({ step_id }, properties.api.getStep);

    showSnackbar("info", isEdit ? "Updating step..." : "Creating step...");
    PostData(post_url, step_data, onSaveSuccess, onSaveFail);
  }

  function onSaveSuccess() {
    showSnackbar("success", isEdit ? "Step updation successful" : "Step creation successful");
    setCanRedirect(true);
  }

  function onSaveFail(response) {
    const error_msg = showErrorHandlerUpdated(response);
    showSnackbar("error", isEdit ? "Step updation failed" : "Step creation failed", error_msg);
    let error;
    if (typeof response === "object") {
      Object.keys(response)?.forEach((errorKey) => { error = response[errorKey]; });
    } else {
      error = response;
    }
    setErrorMsg(Array.isArray(error) ? error[0] : error);
  }

  function goBack() {
    safeNavigateBack(navigate, `/step/list`);
  }

  // ── Loading / Error states ────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="d-flex" style={{ height: "var(--space-690)" }}>
        <Loading varient="light" />
      </div>
    );
  }

  if (dataLoadFailure) {
    return <PageError statusCode={403} error={null} disableHomeBtn={true} />;
  }

  return (
    <div className={classes.root}>
      {canRedirect ? <Navigate to="/step/list" /> : null}

      <Button variant="back" startIcon="ri-arrow-left-s-line" onClick={goBack}>
        Back
      </Button>

      <PageHeader
        heading={workflow_name}
        subHeading={isEdit ? "Update step details" : "Setup in few steps"}
        primaryButton={null}
        commonDivMargin={true}
      />

      {errorMsg && <AlertStrip variant="error" message={errorMsg} />}

      <div className="card-wrapper-one" style={{ padding: "var(--space-0)" }}>
        <StepWizard
          dataJson={wizardDataJson}
          prev_state={
            tabRestoreTarget
              ? tabRestoreTarget
              : (isEdit || isClone) && panels
                ? { panels, selectedTabOrder: 1 }
                : null
          }
          onSubmit={onSubmit}
          sendTabChangeEvent={(order) => {
            selectedTabOrderRef.current = order;
            if (tabRestoreTarget) {
              Promise.resolve().then(() => setTabRestoreTarget(null));
            }
          }}
          moveBackEvent={(order) => {
            selectedTabOrderRef.current = order;
            if (tabRestoreTarget) {
              Promise.resolve().then(() => setTabRestoreTarget(null));
            }
          }}
          stepper_variant="new_ui"
          cancelButtonUrl={goBack}
          footer={CustomWizardFooter}
          enableSaveAndExit={isEdit}
          extraProps={{ setStepType: handleSetStepType, persistentState }}
        />
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const useStyles = makeStyles((theme) => ({
  root: {
    height: "100%",
    flexGrow: 1,
    padding: "var(--space-10) var(--space-20)",
    backgroundColor: "var(--color-white)",

    "& .card-wrapper-one": {
      "& .md-stepper-wrapper": {
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "var(--color-white)",
        width: "100%",
      },
      "& .md-stepper-horizontal": {
        maxWidth: "100% !important",
        backgroundColor: "var(--color-white)",
      },
      "& .card": {
        backgroundColor: "var(--color-white)",
        boxShadow: "none",
      },
      "& .card-add-service-head": {
        backgroundColor: "var(--color-white)",
        border: "none !important",
      },
      "& .card-footer": {
        border: "none",
        background: "var(--color-white)",
        gap: "var(--space-5)",
        position: "sticky",
        bottom: 0,
        zIndex: 10,
      },
    },

    "& .with-header": { borderTop: "var(--space-1) solid #dedede" },
    "& .card": {
      "& .cust-border": {
        "& input": {
          "&:focus": {
            outline: "none !important",
            border: "var(--space-1) solid var(--color-grey-400) !important",
            borderRadius: "var(--space-0) !important",
            borderLeft: "var(--space-0) !important",
          },
        },
        "& .field-icon": { marginLeft: "90%" },
      },
    },
  },
}));

export default CreateNewStepCatalogRevamp;


STEPCATALOGOUTPUT.JSimport React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import { Input } from "../../../../components/genericComponents/Input";
import StepCatalogModal from "./CreateStepDialog";
import { Box } from "@mui/material";

const SELECT_TOOL_OPTIONS = [
  { id: "bandit_scan", label: "Bandit Scan" },
  { id: "sonarqube_scan", label: "SonarQube Scan" },
  { id: "owasp_scan", label: "OWASP Scan" },
  { id: "java_pmd", label: "Java PMD" },
  { id: "cred_scan", label: "Cred Scan" },
  { id: "gitleaks_scan", label: "Gitleaks Scan" },
  { id: "others", label: "Others" },
];

export function getOutputsDefaultState() {
  return {
    data: {
      output_variables: [{ output_variable_name: "", description: "" }],
      generate_report: true,
      select_tool: "",
      report_file_name: "",
    },
    error: {},
  };
}
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

const StepCatalogOutput = ({ inherits, prev_state }) => {
  const [state, setState] = useState(() =>
    prev_state
      ? safeMerge(getOutputsDefaultState(), getOutputsDefaultState(), prev_state)
      : getOutputsDefaultState()
  );
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getOutputsDefaultState(), s, prev_state));
    }
  }, [prev_state]);

  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      const errors = {};
      const varErrors = (state.data.output_variables ?? []).map((row) => {
        const rowErr = {};
        if (!row.output_variable_name?.trim()) rowErr.output_variable_name = "Required";
        if (!row.description?.trim()) rowErr.description = "Required";
        return rowErr;
      });
      if (varErrors.some((e) => Object.keys(e).length > 0)) errors.output_variables = varErrors;
      if (state.data.generate_report) {
        if (!state.data.select_tool) errors.select_tool = "Select Tool is required";
        if (!state.data.report_file_name?.trim()) errors.report_file_name = "Report File Name is required";
      }
      if (Object.keys(errors).length > 0) { setState((s) => ({ ...s, error: errors })); return { valid: false }; }
      return { valid: true };
    };
  }
  function onVarChange(index, field, value) {
    const updated = (state.data.output_variables ?? []).map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    setState((s) => ({ ...s, data: { ...s.data, output_variables: updated }, error: { ...s.error, output_variables: undefined } }));
  }

  function addVarRow() {
    setState((s) => ({
      ...s,
      data: {
        ...s.data,
        output_variables: [...(s.data.output_variables ?? []), { output_variable_name: "", description: "" }]
      }
    }));
  }

  function removeVarRow(index) {
    setState((s) => ({
      ...s,
      data: {
        ...s.data,
        output_variables: (s.data.output_variables ?? []).filter((_, i) => i !== index)
      }
    }));
  }

  function onChangeHandler(e) {
    const { name, value } = e.target;
    setState((s) => ({ ...s, data: { ...s.data, [name]: value }, error: { ...s.error, [name]: "" } }));
  }

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2f2f2f", marginBottom: "24px" }}>Please fill the following details</p>

      {/* ══ Output Variables ══ */}
      <div style={outStyles.card}>
        <div style={outStyles.cardHeader}>
          <p style={outStyles.cardTitle}>Add Output Variable <span style={outStyles.cardTitleSub}>(You can add multiple)</span></p>
          <p style={outStyles.cardDesc}>
            Define values that this step will generate and pass to later steps in the pipeline. Use output variables for generated image tags, scan results, report paths, deployment status, artifact names, or any value that another step may need.
            <a href="#" onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }}
              style={{ color: "rgba(0, 134, 255, 1)", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Know More</a>
          </p>
        </div>
        <div style={outStyles.tableBody}>
          <div style={outStyles.tableHeaderRow}>
            <div style={outStyles.colVarName}><span style={outStyles.colHeaderText}>Output Variable Name<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={outStyles.colDesc}><span style={outStyles.colHeaderText}>Description<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={{ width: "46px", flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(state.data.output_variables ?? []).map((row, index) => {
              const rowError = state.error.output_variables?.[index] || {};
              return (
                <div key={index} style={outStyles.tableRow}>
                  <div style={outStyles.colVarName}>
                    <Input type="text" name={`out_var_name_${index}`} placeholder="Enter Output Variable"
                      data={{ [`out_var_name_${index}`]: row.output_variable_name }}
                      error={rowError.output_variable_name ? { [`out_var_name_${index}`]: rowError.output_variable_name } : {}}
                      onChangeHandler={(e) => onVarChange(index, "output_variable_name", e.target.value)} />
                  </div>
                  <div style={outStyles.colDesc}>
                    <Input type="text" name={`out_desc_${index}`} placeholder="Enter Description"
                      data={{ [`out_desc_${index}`]: row.description }}
                      error={rowError.description ? { [`out_desc_${index}`]: rowError.description } : {}}
                      onChangeHandler={(e) => onVarChange(index, "description", e.target.value)} />
                  </div>
                  <button onClick={() => removeVarRow(index)} style={outStyles.deleteBtn} title="Remove">
                    <span className="ri-delete-bin-7-line" style={{ fontSize: "20px", color: "#EF4444" }} />
                  </button>
                </div>
              );
            })}
          </div>
          <button style={outStyles.addAnotherBtn} onClick={addVarRow}>ADD ANOTHER</button>
        </div>
      </div>

      {/* ══ Report Section ══ */}
      <div style={outStyles.reportSection}>
        <div style={outStyles.toggleRow}>
          <p style={outStyles.toggleLabel}>Will this step generate a report?</p>
          <Tooltip title={state.data.generate_report ? "Click to disable" : "Click to enable"} arrow placement="top">
            <Box className="switch-input-wrapper-v2" sx={{ "& .input-component": { marginBottom: "var(--space-0)" } }}>
              <Input type="only-switch" name="generate_report" data-testid="step-report-switch"
                onChangeHandler={(e) => setState((s) => ({ ...s, data: { ...s.data, generate_report: e.target.checked }, error: { ...s.error, select_tool: "", report_file_name: "" } }))}
                data={{ generate_report: state.data.generate_report }} error={{}} />
            </Box>
          </Tooltip>
        </div>

        {state.data.generate_report && (
          <div style={outStyles.reportFields}>
            <div style={outStyles.fieldGroup}>
              <div style={outStyles.fieldLabelRow}>
                <label style={outStyles.fieldLabel}>Select Tool<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></label>
                <Tooltip TransitionComponent={Zoom} title="Select the tool that generates this report, such as Bandit Scan, SonarQube Scan, OWASP Scan, Gitleaks Scan, or Others." placement="right" arrow>
                  <span className="ri-information-line font-14 color-secondary" />
                </Tooltip>
              </div>
              <Input type="select" name="select_tool" data={state.data} error={state.error}
                list={SELECT_TOOL_OPTIONS} renderAsSelect select_default_value="Select"
                onChangeHandler={onChangeHandler} />
            </div>
            <div style={outStyles.fieldGroup}>
              <div style={outStyles.fieldLabelRow}>
                <label style={outStyles.fieldLabel}>Report File Name<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></label>
                <Tooltip TransitionComponent={Zoom} title="Enter the generated report file name with extension. Only .json and .csv files are supported." placement="right" arrow>
                  <span className="ri-information-line font-14 color-secondary" />
                </Tooltip>
              </div>
              <Input type="text" name="report_file_name" placeholder="filename.ext"
                data={state.data} error={state.error} onChangeHandler={onChangeHandler} />
            </div>
          </div>
        )}
      </div>

      <StepCatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
};

StepCatalogOutput.propTypes = { inherits: PropTypes.object, prev_state: PropTypes.object };

const outStyles = {
  card: {
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-12)",
    overflow: "hidden",
    backgroundColor: "var(--color-white)",
    marginBottom: "var(--space-24)",
    boxShadow: "var(--shadow-md)",
  },
  cardHeader: {
    backgroundColor: "var(--color-grey-000)",
    padding: "var(--space-16) var(--space-24)",
    borderBottom: "1px solid var(--color-border-grey)",
  },
  cardTitle: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-6) 0",
  },
  cardTitleSub: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
  },
  cardDesc: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
    margin: 0,
    lineHeight: "var(--line-height-22)",
  },
  tableBody: {
    padding: "var(--space-16) var(--space-24) var(--space-20)",
  },
  tableHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-12)",
    marginBottom: "var(--space-10)",
    padding: "var(--space-10)",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-8)",
    backgroundColor: "var(--color-grey-000)",
  },
  colHeaderText: {
    fontSize: "var(--font-13)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
  },
  tableRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-12)",
  },
  colVarName: { flex: "0 0 42%", maxWidth: "42%" },
  colDesc: { flex: 1 },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    marginTop: "var(--space-2)",
  },
  addAnotherBtn: {
    marginTop: "var(--space-6)",
    padding: "var(--space-8) var(--space-16)",
    border: "1px solid var(--color-primary-300)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-primary-500)",
    cursor: "pointer",
    letterSpacing: "0.4px",
  },
  reportSection: {
    marginTop: "var(--space-8)",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-16)",
    marginBottom: "var(--space-24)",
  },
  toggleLabel: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: 0,
  },
  reportFields: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-10)",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6)",
  },
  fieldLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-6)",
  },
  fieldLabel: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-500)",
    color: "var(--color-content-primary)",
  },
};

export { StepCatalogOutput };
export default StepCatalogOutput;

MOUNTS.JS

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Input } from "../../../../components/genericComponents/Input";
import StepCatalogModal from "./CreateStepDialog";
import InvokeApi from "../../../../util/apiInvoker";
import GenerateURL from "../../../../util/APIUrlProvider";
import properties from "../../../../properties/properties";

export function getMountsDefaultState() {
  return {
    data: {
      mount_details: [{ mount_name: "", mount_source: "", mount_destination: "" }],
      custom_mount_paths: [{ mount_source: "", mount_destination: "" }],
    },
    error: {},
  };
}
// Generic safe merge helper — put this in a shared util or inline per component
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

const Mounts = ({ inherits, prev_state }) => {
  const [state, setState] = useState(prev_state || getMountsDefaultState());
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [mountOptions, setMountOptions] = useState([]);
  const [mountDataMap, setMountDataMap] = useState({});

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getMountsDefaultState(), s, prev_state));
    }
  }, [prev_state]);


  useEffect(() => {
    InvokeApi(
      {
        endPoint: GenerateURL({}, properties.api.stepMount),
        httpMethod: "GET",
        httpHeaders: { "Content-Type": "application/json" },
      },
      (response) => {
        const results = response.results || response || [];
        setMountOptions(results.map((m) => ({ id: String(m.id), label: m.name })));
        const map = {};
        results.forEach((m) => {
          map[String(m.id)] = {
            source_path: m.source_path || "",
            destination_path: m.destination_path || "",
            name: m.name,
            code: m.code,
            description: m.description || "",
          };
        });
        setMountDataMap(map);
      },
      (err) => console.error("Failed to load mount paths", err)
    );
  }, []);

  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      const errors = {};
      const mountDetailErrors = state.data.mount_details.map((row) => {
        const rowErr = {};
        if (!String(row.mount_name || "").trim()) rowErr.mount_name = "Required";
        if (!String(row.mount_source || "").trim()) rowErr.mount_source = "Required";
        if (!String(row.mount_destination || "").trim()) rowErr.mount_destination = "Required";
        return rowErr;
      });
      if (mountDetailErrors.some((e) => Object.keys(e).length > 0))
        errors.mount_details = mountDetailErrors;

      const customMountErrors = state.data.custom_mount_paths.map((row) => {
        const rowErr = {};
        if (!String(row.mount_source || "").trim()) rowErr.mount_source = "Required";
        if (!String(row.mount_destination || "").trim()) rowErr.mount_destination = "Required";
        return rowErr;
      });
      if (customMountErrors.some((e) => Object.keys(e).length > 0))
        errors.custom_mount_paths = customMountErrors;

      if (Object.keys(errors).length > 0) {
        setState((s) => ({ ...s, error: errors }));
        return { valid: false };
      }
      return { valid: true };
    };
  }

  function onMountNameChange(index, selectedId) {
    const autoFill = mountDataMap[selectedId] || { source_path: "", destination_path: "" };
    const updated = state.data.mount_details.map((row, i) =>
      i === index
        ? { ...row, mount_name: selectedId, mount_source: autoFill.source_path, mount_destination: autoFill.destination_path }
        : row
    );
    setState((s) => ({
      ...s,
      data: { ...s.data, mount_details: updated },
      error: {
        ...s.error,
        mount_details: s.error.mount_details
          ? s.error.mount_details.map((rowErr, i) => (i === index ? {} : rowErr))
          : [],
      },
    }));
  }

  function onMountDetailChange(index, field, value) {
    const updated = state.data.mount_details.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    const updatedErrors = state.error.mount_details
      ? state.error.mount_details.map((rowErr, i) =>
        i === index ? { ...rowErr, [field]: "" } : rowErr
      )
      : [];
    setState((s) => ({ ...s, data: { ...s.data, mount_details: updated }, error: { ...s.error, mount_details: updatedErrors } }));
  }

  function addMountDetail() {
    setState((s) => ({
      ...s,
      data: { ...s.data, mount_details: [...s.data.mount_details, { mount_name: "", mount_source: "", mount_destination: "" }] },
    }));
  }

  function removeMountDetail(index) {
    setState((s) => ({
      ...s,
      data: { ...s.data, mount_details: s.data.mount_details.filter((_, i) => i !== index) },
    }));
  }

  function onCustomMountChange(index, field, value) {
    const updated = state.data.custom_mount_paths.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    const updatedErrors = state.error.custom_mount_paths
      ? state.error.custom_mount_paths.map((rowErr, i) =>
        i === index ? { ...rowErr, [field]: "" } : rowErr
      )
      : [];
    setState((s) => ({ ...s, data: { ...s.data, custom_mount_paths: updated }, error: { ...s.error, custom_mount_paths: updatedErrors } }));
  }

  function addCustomMount() {
    setState((s) => ({
      ...s,
      data: { ...s.data, custom_mount_paths: [...s.data.custom_mount_paths, { mount_source: "", mount_destination: "" }] },
    }));
  }

  function removeCustomMount(index) {
    setState((s) => ({
      ...s,
      data: { ...s.data, custom_mount_paths: s.data.custom_mount_paths.filter((_, i) => i !== index) },
    }));
  }

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2f2f2f", marginBottom: "24px" }}>
        Please fill the following details
      </p>

      {/* ══ Mount Details Card ══ */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardTitle}>Add Mount Details<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></p>
          <p style={styles.cardDesc}>
            Use mount details when the step needs access to BuildPiper-managed folders, credentials, workspace data, or platform files. For example, mount the workspace to access source code, Docker socket for image build/push, kubeconfig for Kubernetes deployment, or AWS/GCloud folders for cloud operations.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }}
              style={{ color: "#1677FF", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Know More</a>
          </p>
        </div>

        <div style={styles.tableBody}>
          <div style={styles.tableHeaderRow}>
            <div style={styles.colMountName}><span style={styles.colHeaderText}>Mount Name<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={styles.colMountSource}><span style={styles.colHeaderText}>Mount Source<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={styles.colMountDest}><span style={styles.colHeaderText}>Mount Destination<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={{ width: "46px", flexShrink: 0 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {state.data.mount_details.map((row, index) => {
              const rowError = state.error.mount_details?.[index] || {};
              return (
                <div key={index} style={styles.tableRow}>
                  <div style={styles.colMountName}>
                    <Input type="select" name={`mount_name_${index}`} placeholder="Select"
                      data={{ [`mount_name_${index}`]: String(row.mount_name || "") }}
                      error={rowError.mount_name ? { [`mount_name_${index}`]: rowError.mount_name } : {}}
                      list={mountOptions} renderAsSelect remove_default_value={false} select_default_value="Select"
                      onChangeHandler={(e) => onMountNameChange(index, e.target.value)} />
                  </div>
                  <div style={styles.colMountSource}>
                    <Input type="text" name={`mount_source_${index}`} placeholder="$HOME/common/templates"
                      data={{ [`mount_source_${index}`]: row.mount_source }}
                      error={rowError.mount_source ? { [`mount_source_${index}`]: rowError.mount_source } : {}}
                      onChangeHandler={(e) => onMountDetailChange(index, "mount_source", e.target.value)} />
                  </div>
                  <div style={styles.colMountDest}>
                    <Input type="text" name={`mount_dest_${index}`} placeholder="/bp/notify/template"
                      data={{ [`mount_dest_${index}`]: row.mount_destination }}
                      error={rowError.mount_destination ? { [`mount_dest_${index}`]: rowError.mount_destination } : {}}
                      onChangeHandler={(e) => onMountDetailChange(index, "mount_destination", e.target.value)} />
                  </div>
                  <button onClick={() => removeMountDetail(index)} style={styles.deleteBtn} title="Remove">
                    <span className="ri-delete-bin-7-line" style={{ fontSize: "20px", color: "#EF4444" }} />
                  </button>
                </div>
              );
            })}
          </div>
          <button style={styles.addAnotherBtn} onClick={addMountDetail}>ADD ANOTHER</button>
        </div>
      </div>

      {/* ══ Custom Mount Path Card ══ */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardTitle}>Add Custom Mount Path Details<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></p>
          <p style={styles.cardDesc}>
            Use this when the step needs an additional custom source path and destination path that is not already available in predefined mount options. The source is the path from the host/execution environment, and the destination is where it will be available inside the step container.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }}
              style={{ color: "#1677FF", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Know More</a>
          </p>
        </div>

        <div style={styles.tableBody}>
          <div style={styles.tableHeaderRow}>
            <div style={styles.colHalf}><span style={styles.colHeaderText}>Mount Source<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={styles.colHalf}><span style={styles.colHeaderText}>Mount Destination<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></span></div>
            <div style={{ width: "46px", flexShrink: 0 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {state.data.custom_mount_paths.map((row, index) => {
              const rowError = state.error.custom_mount_paths?.[index] || {};
              return (
                <div key={index} style={styles.tableRow}>
                  <div style={styles.colHalf}>
                    <Input type="text" name={`custom_source_${index}`} placeholder="Enter"
                      data={{ [`custom_source_${index}`]: row.mount_source }}
                      error={rowError.mount_source ? { [`custom_source_${index}`]: rowError.mount_source } : {}}
                      onChangeHandler={(e) => onCustomMountChange(index, "mount_source", e.target.value)} />
                  </div>
                  <div style={styles.colHalf}>
                    <Input type="text" name={`custom_dest_${index}`} placeholder="Enter"
                      data={{ [`custom_dest_${index}`]: row.mount_destination }}
                      error={rowError.mount_destination ? { [`custom_dest_${index}`]: rowError.mount_destination } : {}}
                      onChangeHandler={(e) => onCustomMountChange(index, "mount_destination", e.target.value)} />
                  </div>
                  <button onClick={() => removeCustomMount(index)} style={styles.deleteBtn} title="Remove">
                    <span className="ri-delete-bin-7-line" style={{ fontSize: "20px", color: "#EF4444" }} />
                  </button>
                </div>
              );
            })}
          </div>
          <button style={styles.addAnotherBtn} onClick={addCustomMount}>ADD ANOTHER</button>
        </div>
      </div>

      <StepCatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
};

Mounts.propTypes = {
  inherits: PropTypes.object,
  prev_state: PropTypes.object,
};

const styles = {
  card: {
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-12)",
    overflow: "hidden",
    backgroundColor: "var(--color-white)",
    marginBottom: "var(--space-20)",
  },
  cardHeader: {
    backgroundColor: "var(--color-grey-000)",
    padding: "var(--space-16) var(--space-24)",
    borderBottom: "1px solid var(--color-border-grey)",
  },
  cardTitle: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-6) 0",
  },
  cardDesc: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
    margin: 0,
    lineHeight: "var(--line-height-22)",
  },
  tableBody: {
    padding: "var(--space-16) var(--space-24) var(--space-20)",
  },
  tableHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-12)",
    marginBottom: "var(--space-10)",
    padding: "var(--space-10)",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-8)",
    backgroundColor: "var(--color-grey-000)",
  },
  colHeaderText: {
    fontSize: "var(--font-13)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
  },
  tableRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-12)",
  },
  colMountName: { flex: "0 0 30%", maxWidth: "30%" },
  colMountSource: { flex: "0 0 30%", maxWidth: "30%" },
  colMountDest: { flex: 1 },
  colHalf: { flex: 1 },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    marginTop: "2px",
  },
  addAnotherBtn: {
    marginTop: "var(--space-6)",
    padding: "var(--space-8) var(--space-16)",
    border: "1px solid var(--color-primary-300)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-primary-500)",
    cursor: "pointer",
    letterSpacing: "0.4px",
  },
};

export default Mounts;


STEPCATALOGINPUT.JS

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Input } from "../../../../components/genericComponents/Input";
import StepCatalogModal from "./CreateStepDialog";
import InvokeApi from "../../../../util/apiInvoker";
import GenerateURL from "../../../../util/APIUrlProvider";
import properties from "../../../../properties/properties";

const VARIABLE_DATA_TYPE_OPTIONS = [
  { id: "text", label: "Text box" },
  { id: "textarea", label: "Text Area" },
  { id: "toggle", label: "Toggle" },
  { id: "select", label: "Select" },
  { id: "password", label: "Password" },
];

const DEFAULT_VALUE_YES_NO = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
];

// Generic safe merge helper — put this in a shared util or inline per component
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

export function getInputsDefaultState() {
  return {
    data: {
      environment_variables: [
        { variable_data_type: "", variable_name: "", default_value_toggle: "yes", default_value: "", required: true, overridable: false, step_specific: false },
      ],
      integration_variables: [
        { integration_type: "", integration_code: "", integration_key: "integration_1", required: true },
      ],
    },
    error: {},
  };
}

const BlueCheckbox = ({ checked, onChange }) => (
  <label style={{ cursor: "pointer", display: "inline-flex" }}>
    <input type="checkbox" checked={checked} onChange={onChange}
      style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: "22px", height: "22px", borderRadius: "4px",
      border: checked ? "2px solid #1677FF" : "2px solid #D1D5DB",
      backgroundColor: checked ? "#1677FF" : "#fff", transition: "all 0.15s", flexShrink: 0,
    }}>
      {checked && <span className="ri-check-fill" style={{ fontSize: "18px", fontWeight: "700", color: "#fcfcfcff" }} />}
    </span>
  </label>
);

const StepCatalogInput = ({ inherits, prev_state }) => {
  const [state, setState] = useState(prev_state || getInputsDefaultState());
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [integrationTypeOptions, setIntegrationTypeOptions] = useState([]);

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getInputsDefaultState(), s, prev_state));
    }
  }, [prev_state]);

  useEffect(() => {
    InvokeApi(
      { endPoint: GenerateURL({}, properties.api.getIntegrationTypes), httpMethod: "GET", httpHeaders: { "Content-Type": "application/json" } },
      (response) => {
        const results = response.results || response || [];
        setIntegrationTypeOptions(
          results.map((item) => ({ id: String(item.id), label: item.name, code: item.code }))
        );
      },
      (err) => console.error("Failed to load integration types", err)
    );
  }, []);

  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      const errors = {};
      const envErrors = state.data.environment_variables.map((row) => {
        const rowErr = {};
        if (!row.variable_data_type) rowErr.variable_data_type = "Required";
        if (!row.variable_name?.trim()) rowErr.variable_name = "Required";
        return rowErr;
      });
      if (envErrors.some((e) => Object.keys(e).length > 0)) errors.environment_variables = envErrors;

      const intErrors = state.data.integration_variables.map((row) => {
        const rowErr = {};
        if (!row.integration_type) rowErr.integration_type = "Required";
        if (!row.integration_key?.trim()) rowErr.integration_key = "Required";
        return rowErr;
      });
      if (intErrors.some((e) => Object.keys(e).length > 0)) errors.integration_variables = intErrors;

      if (Object.keys(errors).length > 0) { setState((s) => ({ ...s, error: errors })); return { valid: false }; }
      return { valid: true };
    };
  }

  function onEnvChange(index, field, value) {
    const updated = state.data.environment_variables.map((row, i) => i === index ? { ...row, [field]: value } : row);
    setState((s) => ({ ...s, data: { ...s.data, environment_variables: updated } }));
  }

  function addEnvRow() {
    setState((s) => ({
      ...s,
      data: { ...s.data, environment_variables: [...s.data.environment_variables, { variable_data_type: "", variable_name: "", default_value_toggle: "yes", default_value: "", required: true, overridable: false, step_specific: false }] },
    }));
  }

  function removeEnvRow(index) {
    setState((s) => ({ ...s, data: { ...s.data, environment_variables: s.data.environment_variables.filter((_, i) => i !== index) } }));
  }

  function onIntChange(index, field, value) {
    const updated = state.data.integration_variables.map((row, i) => {
      if (i !== index) return row;
      if (field === "integration_type") {
        const match = integrationTypeOptions.find((o) => o.id === value);
        return { ...row, integration_type: value, integration_code: match?.code || "" };
      }
      return { ...row, [field]: value };
    });
    setState((s) => ({ ...s, data: { ...s.data, integration_variables: updated } }));
  }

  function addIntRow() {
    setState((s) => ({ ...s, data: { ...s.data, integration_variables: [...s.data.integration_variables, { integration_type: "", integration_code: "", integration_key: "", required: false }] } }));
  }

  function removeIntRow(index) {
    setState((s) => ({ ...s, data: { ...s.data, integration_variables: s.data.integration_variables.filter((_, i) => i !== index) } }));
  }

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2f2f2f", marginBottom: "24px" }}>Please fill the following details</p>

      {/* ══ Environment Variables ══ */}
      <div style={inStyles.card}>
        <div style={inStyles.cardHeader}>
          <p style={inStyles.cardTitle}>Add Environment/Input Variable<span style={inStyles.cardTitleSub}>(You can add multiple)</span></p>
          <p style={inStyles.cardDesc}>
            Add runtime configuration values required by the step. These variables control how the step behaves during execution. Some variables can be fixed by the platform, while others can be overridable at job-template level. Example variables: WORKSPACE, ACTION, DNS_URL, CUSTOM_MESSAGE, or VALIDATION_FAILURE_ACTION.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }} style={{ color: "#1677FF", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Know More</a>
          </p>
        </div>
        <div style={inStyles.tableBody}>
          <div style={inStyles.envHeaderRow}>
            <div style={inStyles.colDataType}><span style={inStyles.colHeader}>Variable Data Type<span style={inStyles.asterisk}>*</span></span></div>
            <div style={inStyles.colVarName}><span style={inStyles.colHeader}>Variable Name<span style={inStyles.asterisk}>*</span></span></div>
            <div style={inStyles.colDefaultValue}><span style={inStyles.colHeader}>Default Value<span style={inStyles.asterisk}>*</span></span></div>
            <div style={inStyles.colHeading}><span style={inStyles.colHeader}>Required</span></div>
            <div style={inStyles.colHeading}><span style={inStyles.colHeader}>Overridable</span></div>
            <div style={inStyles.colHeading}><span style={inStyles.colHeader}>Step Specific</span></div>
            <div style={{ width: "46px", flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {state.data.environment_variables.map((row, index) => {
              const rowError = state.error.environment_variables?.[index] || {};
              return (
                <div key={index} style={inStyles.tableRow}>
                  <div style={inStyles.colDataType}>
                    <Input type="select" name={`env_data_type_${index}`}
                      data={{ [`env_data_type_${index}`]: row.variable_data_type }}
                      error={rowError.variable_data_type ? { [`env_data_type_${index}`]: rowError.variable_data_type } : {}}
                      list={VARIABLE_DATA_TYPE_OPTIONS} renderAsSelect select_default_value="Select"
                      onChangeHandler={(e) => onEnvChange(index, "variable_data_type", e.target.value)} />
                  </div>
                  <div style={inStyles.colVarName}>
                    <Input type="text" name={`env_var_name_${index}`} placeholder="Enter Name"
                      data={{ [`env_var_name_${index}`]: row.variable_name }}
                      error={rowError.variable_name ? { [`env_var_name_${index}`]: rowError.variable_name } : {}}
                      onChangeHandler={(e) => onEnvChange(index, "variable_name", e.target.value)} />
                  </div>
                  <div style={inStyles.colDefaultValue}>
                    <div style={inStyles.defaultValueInner}>
                      <div style={{ width: "90px", flexShrink: 0 }}>
                        <Input type="select" name={`env_dv_toggle_${index}`}
                          data={{ [`env_dv_toggle_${index}`]: row.default_value_toggle }}
                          error={{}} list={DEFAULT_VALUE_YES_NO} renderAsSelect remove_default_value
                          onChangeHandler={(e) => onEnvChange(index, "default_value_toggle", e.target.value)} />
                      </div>
                      <Input type="text" name={`env_dv_val_${index}`} placeholder="Enter Value"
                        data={{ [`env_dv_val_${index}`]: row.default_value }}
                        error={{}} onChangeHandler={(e) => onEnvChange(index, "default_value", e.target.value)} />
                    </div>
                  </div>
                  <div style={inStyles.colCheckbox} data-testid="step-env-checkbox">
                    <BlueCheckbox checked={row.required} onChange={(e) => onEnvChange(index, "required", e.target.checked)} />
                  </div>
                  <div style={inStyles.colCheckbox} data-testid="step-env-checkbox">
                    <BlueCheckbox checked={row.overridable} onChange={(e) => onEnvChange(index, "overridable", e.target.checked)} />
                  </div>
                  <div style={inStyles.colCheckbox} data-testid="step-env-checkbox">
                    <BlueCheckbox checked={row.step_specific} onChange={(e) => onEnvChange(index, "step_specific", e.target.checked)} />
                  </div>
                  <button onClick={() => removeEnvRow(index)} style={inStyles.deleteBtn} title="Remove" data-testid="step-env-remove-btn">
                    <span className="ri-delete-bin-7-line" style={{ fontSize: "20px", color: "#EF4444" }} />
                  </button>
                </div>
              );
            })}
          </div>
          <button style={inStyles.addAnotherBtn} onClick={addEnvRow} data-testid="step-env-addanonther-btn">ADD ANOTHER</button>
        </div>
      </div>

      <div style={inStyles.card}>
        <div style={inStyles.cardHeader}>
          <p style={inStyles.cardTitle}>Add Integration Variable <span style={inStyles.cardTitleSub}>(You can add multiple)</span></p>
          <p style={inStyles.cardDesc}>
            Add the BuildPiper integration inputs required by this step, such as credentials, tokens, URLs, project keys, repositories, or registry details for Jira, ServiceNow, Git, Artifactory, container registry, or other supported integrations.These variables define the step's execution behavior. They can be platform-fixed or overridable at the job template level.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }} style={{ color: "#1677FF", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Know More</a>
          </p>
        </div>
        <div style={inStyles.tableBody}>
          <div style={inStyles.intHeaderRow}>
            <div style={inStyles.colIntType}><span style={inStyles.colHeader}>Integration Type<span style={inStyles.asterisk}>*</span></span></div>
            <div style={inStyles.colIntKey}><span style={inStyles.colHeader}>Integration Key<span style={inStyles.asterisk}>*</span></span></div>
            <div style={inStyles.colCheckboxInt}><span style={inStyles.colHeader}>Required</span></div>
            <div style={{ width: "46px", flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {state.data.integration_variables.map((row, index) => {
              const rowError = state.error.integration_variables?.[index] || {};
              return (
                <div key={index} style={inStyles.tableRow}>
                  <div style={inStyles.colIntType}>
                    <Input type="select" name={`int_type_${index}`}
                      data={{ [`int_type_${index}`]: row.integration_type }}
                      error={rowError.integration_type ? { [`int_type_${index}`]: rowError.integration_type } : {}}
                      list={integrationTypeOptions} renderAsSelect select_default_value="Select"
                      onChangeHandler={(e) => onIntChange(index, "integration_type", e.target.value)} />
                  </div>
                  <div style={inStyles.colIntKey}>
                    <Input type="text" name={`int_key_${index}`} placeholder="Enter Name"
                      data={{ [`int_key_${index}`]: row.integration_key }}
                      error={rowError.integration_key ? { [`int_key_${index}`]: rowError.integration_key } : {}}
                      onChangeHandler={(e) => onIntChange(index, "integration_key", e.target.value)} />
                  </div>
                  <div style={inStyles.colCheckbox}>
                    <BlueCheckbox checked={row.required} onChange={(e) => onIntChange(index, "required", e.target.checked)} />
                  </div>
                  <button onClick={() => removeIntRow(index)} style={inStyles.deleteBtn} title="Remove">
                    <span className="ri-delete-bin-7-line" style={{ fontSize: "20px", color: "#EF4444" }} />
                  </button>
                </div>
              );
            })}
          </div>
          <button style={inStyles.addAnotherBtn} onClick={addIntRow}>ADD ANOTHER</button>
        </div>
      </div>

      <StepCatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
};

StepCatalogInput.propTypes = { inherits: PropTypes.object, prev_state: PropTypes.object };
const inStyles = {
  card: {
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-12)",
    overflow: "hidden",
    backgroundColor: "var(--color-white)",
    marginBottom: "var(--space-20)",
  },
  cardHeader: {
    backgroundColor: "var(--color-grey-000)",
    padding: "var(--space-16) var(--space-24)",
    borderBottom: "1px solid var(--color-border-grey)",
  },
  cardTitle: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-6) 0",
  },
  cardTitleSub: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
  },
  cardDesc: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
    margin: 0,
    lineHeight: "var(--line-height-22)",
  },
  tableBody: {
    padding: "var(--space-16) var(--space-24) var(--space-20)",
  },
  envHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-10)",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-8)",
    padding: "var(--space-8)",
    backgroundColor: "var(--color-grey-000)",
    marginBottom: "var(--space-10)",
  },
  intHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-10)",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-8)",
    padding: "var(--space-8)",
    backgroundColor: "var(--color-grey-000)",
    marginBottom: "var(--space-10)",
  },
  tableRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-10)",
  },
  colDataType: { flex: "0 0 180px", maxWidth: "180px" },
  colVarName: { flex: "0 0 160px", maxWidth: "160px" },
  colDefaultValue: { flex: 1 },
  colCheckbox: {
    marginTop: "var(--space-10)",
    flex: "0 0 120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  colCheckboxInt: {
    paddingLeft: "var(--space-30)",
    flex: "0 0 120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  colHeading: {
    flex: "0 0 120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  colIntType: { flex: "0 0 280px", maxWidth: "280px" },
  colIntKey: { flex: 1 },
  colHeader: {
    fontSize: "var(--font-13)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
  },
  asterisk: {
    color: "var(--color-error-500)",
    marginLeft: "var(--space-2)",
  },
  defaultValueInner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-6)",
  },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    marginTop: "var(--space-2)",
  },
  addAnotherBtn: {
    marginTop: "var(--space-6)",
    padding: "var(--space-8) var(--space-16)",
    border: "1px solid var(--color-primary-300)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-primary-500)",
    cursor: "pointer",
    letterSpacing: "0.4px",
  },
};

export default StepCatalogInput;

DATAPATHS.JS


import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import StepCatalogModal from "./CreateStepDialog";
import InvokeApi from "../../../../util/apiInvoker";
import GenerateURL from "../../../../util/APIUrlProvider";
import properties from "../../../../properties/properties";

export function getDataPathsDefaultState() {
  return {
    data: { selected_data_paths: [] },
    error: {},
  };
}
// Generic safe merge helper — put this in a shared util or inline per component
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

function deriveGroup(code = "") {
  if (code.startsWith("SERVICE")) return "Service";
  if (code.startsWith("DEPLOYMENT")) return "Deployment";
  if (code.startsWith("ANDROID")) return "Android";
  if (code.startsWith("CANARY")) return "Canary";
  if (code.startsWith("INGRESS")) return "Ingress";
  if (code.startsWith("HELM")) return "Helm";
  if (code.startsWith("PIPELINE")) return "Pipeline";
  if (code.startsWith("ROLLOUT")) return "Rollout";
  if (code.startsWith("JIRA") || code.startsWith("SNOW")) return "Integrations";
  if (code.startsWith("ADD_NAMESPACE") || code.startsWith("REMOVE_NAMESPACE")) return "Namespace";
  if (code.startsWith("DATABASE")) return "Database";
  if (code.startsWith("RESOURCE") || code.startsWith("CULSTER_RESOURCE")) return "Resources";
  if (code.startsWith("NON_MS")) return "Non-MS";
  return "Other";
}

const DataPaths = ({ inherits, prev_state }) => {
  const [state, setState] = useState(prev_state || getDataPathsDefaultState());
  const [search, setSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [dataGroups, setDataGroups] = useState([]);
  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getDataPathsDefaultState(), s, prev_state));

    }
  }, [prev_state]);


  useEffect(() => {
    InvokeApi(
      { endPoint: GenerateURL({}, properties.api.getStepDataRequirments), httpMethod: "GET", httpHeaders: { "Content-Type": "application/json" } },
      (response) => {
        const raw = response.results || response || [];
        const flat = [];
        const grouped = [];
        raw.forEach((item) => {
          const group = deriveGroup(item.code || "");
          const mapped = { id: item.id, label: item.name, name: item.name, description: item.description || "", code: item.code || "" };
          flat.push(mapped);
          let g = grouped.find((g) => g.group === group);
          if (!g) { g = { group, items: [] }; grouped.push(g); }
          g.items.push(mapped);
        });
        setAllItems(flat);
        setDataGroups(grouped);
      },
      (err) => console.error("Failed to load data requirements", err)
    );
  }, []);

  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      if (!state.data.selected_data_paths.length) {
        setState((s) => ({ ...s, error: { selected_data_paths: "Please select at least one item" } }));
        return { valid: false };
      }
      return { valid: true };
    };
  }

  const selected = state.data.selected_data_paths;

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return dataGroups;
    const q = search.toLowerCase();
    return dataGroups
      .map((g) => ({ ...g, items: g.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [search, dataGroups]);

  const allFilteredIds = filteredGroups.flatMap((g) => g.items.map((i) => i.id));
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.includes(id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setState((s) => ({ ...s, data: { ...s.data, selected_data_paths: selected.filter((id) => !allFilteredIds.includes(id)) }, error: {} }));
    } else {
      setState((s) => ({ ...s, data: { ...s.data, selected_data_paths: Array.from(new Set([...selected, ...allFilteredIds])) }, error: {} }));
    }
  }

  function toggleItem(id) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setState((s) => ({ ...s, data: { ...s.data, selected_data_paths: next }, error: {} }));
  }

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2f2f2f", marginBottom: "24px" }}>Please fill the following details</p>

      <div style={dpStyles.card}>
        <div style={dpStyles.cardHeader}>
          <p style={dpStyles.cardTitle}>Add Data required for Steps <span style={dpStyles.cardTitleSub}>(You can select multiple)</span></p>
          <p style={dpStyles.cardDesc}>
            Select the BuildPiper data objects required by this step during execution. These data paths provide pipeline context and metadata in JSON format, such as service build details, deployment details, rollback details, Jira integration data, Android configuration details, DORA data, or Run Now details. Select only the data that the step actually needs.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); setSelectedCatalogItem(null); setCatalogOpen(true); }}
              style={{ color: "rgba(0, 134, 255, 1)", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Know More</a>
          </p>
        </div>

        <div style={dpStyles.searchWrapper}>
          <span className="ri-search-line" style={dpStyles.searchIcon} />
          <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} style={dpStyles.searchInput} data-testid="step-data-search-input" />
        </div>

        <div style={dpStyles.selectAllRow}>
          <label style={dpStyles.checkboxLabel}>
            <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} style={dpStyles.hiddenCheckbox} />
            <span style={{ ...dpStyles.customCheckbox, backgroundColor: isAllSelected ? "#1677FF" : "#fff", borderColor: isAllSelected ? "#1677FF" : "#D1D5DB" }}>
              {isAllSelected && <span className="ri-check-fill color-white" />}
            </span>
            <span style={dpStyles.labelText}>Select All</span>
          </label>
        </div>

        <div style={dpStyles.divider} />
        {state.error.selected_data_paths && <p style={dpStyles.errorText}>{state.error.selected_data_paths}</p>}

        <div style={dpStyles.listContainer}>
          {filteredGroups.map((group) => (
            <div key={group.group} data-testid="step-data-list-container">
              <p style={dpStyles.groupHeader}>{group.group}</p>
              {group.items.map((item) => {
                const checked = selected.includes(item.id);
                return (
                  <div key={item.id} style={dpStyles.itemRow}>
                    <label style={dpStyles.checkboxLabel}>
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(item.id)} style={dpStyles.hiddenCheckbox} />
                      <span style={{ ...dpStyles.customCheckbox, backgroundColor: checked ? "rgba(0, 134, 255, 1)" : "#fff", borderColor: checked ? "rgba(0, 134, 255, 1)" : "#D1D5DB" }}>
                        {checked && <span className="ri-check-fill color-white" />}
                      </span>
                      <span style={dpStyles.labelText}>{item.label}</span>
                    </label>
                    <a href="#" onClick={(e) => { e.preventDefault(); setSelectedCatalogItem(item); setCatalogOpen(true); }} style={dpStyles.moreInfoLink}>Know More</a>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <StepCatalogModal isOpen={catalogOpen} onClose={() => { setCatalogOpen(false); setSelectedCatalogItem(null); }}
        defaultCategory={selectedCatalogItem} externalList={allItems} />
    </div>
  );
};

DataPaths.propTypes = { inherits: PropTypes.object, prev_state: PropTypes.object };
const dpStyles = {
  card: {
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-12)",
    overflow: "hidden",
    backgroundColor: "var(--color-white)",
    marginBottom: "var(--space-20)",
  },
  cardHeader: {
    backgroundColor: "var(--color-grey-000)",
    padding: "var(--space-16) var(--space-24)",
    borderBottom: "1px solid var(--color-border-grey)",
  },
  cardTitle: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-6) 0",
  },
  cardTitleSub: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
  },
  cardDesc: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
    margin: 0,
    lineHeight: "var(--line-height-22)",
  },
  searchWrapper: {
    margin: "var(--space-20)",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "var(--space-18)",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "var(--font-18)",
    color: "var(--color-content-tertiary)",
    pointerEvents: "none",
    zIndex: 1,
  },
  searchInput: {
    width: "100%",
    height: "44px",
    padding: "0 var(--space-16) 0 var(--space-60)",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-8)",
    fontSize: "var(--font-18)",
    outline: "none",
    boxSizing: "border-box",
  },
  selectAllRow: {
    padding: "var(--space-14) var(--space-24) var(--space-10)",
  },
  divider: {
    borderBottom: "1px solid var(--color-border-grey)",
    margin: "0 var(--space-24)",
  },
  listContainer: {
    padding: "0 var(--space-24) var(--space-20)",
    maxHeight: "420px",
    overflowY: "auto",
  },
  groupHeader: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-tertiary)",
    letterSpacing: "0.8px",
    margin: "var(--space-18) 0 var(--space-8) 0",
    textTransform: "uppercase",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    minHeight: "38px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-12)",
    cursor: "pointer",
  },
  hiddenCheckbox: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
  },
  customCheckbox: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "var(--radius-4)",
    border: "2px solid var(--color-border-grey)",
    flexShrink: 0,
    transition: "background-color var(--transition-fast), border-color var(--transition-fast)",
    cursor: "pointer",
  },
  labelText: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-500)",
    color: "var(--color-content-primary)",
  },
  moreInfoLink: {
    marginLeft: "var(--space-8)",
    color: "var(--color-tertiary-500)",
    textDecoration: "none",
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-600)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  errorText: {
    color: "var(--color-error-500)",
    fontSize: "var(--font-12)",
    margin: "var(--space-4) var(--space-24) 0",
  },
};

export default DataPaths;

BASICINFO.JS


import React, { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";
import Zoom from "@mui/material/Zoom";
import { Input } from "../../../../components/genericComponents/Input";
import StepCatalogModal from "./CreateStepDialog";
import InvokeApi from "../../../../util/apiInvoker";
import GenerateURL from "../../../../util/APIUrlProvider";
import properties from "../../../../properties/properties";

export function getBasicInfoDefaultState() {
  return {
    data: {
      step_name: "",
      step_version: "v2",
      step_code: "",
      step_description: "",
      step_categories: [],
    },
    error: {},
  };
}
// Generic safe merge helper — put this in a shared util or inline per component
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

const VERSION_OPTIONS = [
  {
    id: "v2",
    label: "V2 – Native Steps",
    description: "Uses a predefined BuildPiper step structure with fixed configuration, inputs, mounts, and execution behavior. Best suited for standard reusable steps.",
  },
  {
    id: "v3",
    label: "V3 – Dynamic Steps",
    description: "Supports a more flexible step structure where configuration, inputs, and execution behavior can be adjusted during CI/CD setup and execution based on service or workflow needs.",
  },
];

const SelectStepCategory = ({ selectedCategories, onCategoryChange, error }) => {
  const [search, setSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState(null);
  const [categoryList, setCategoryList] = useState([]);

  useEffect(() => {
    InvokeApi(
      {
        endPoint: GenerateURL({}, properties.api.stepCatagory),
        httpMethod: "GET",
        httpHeaders: { "Content-Type": "application/json" },
      },
      (response) => {
        const mapped = (response.results || response || []).map((cat) => ({
          id: cat.id,
          label: cat.name,
          description: cat.description || "",
          code: cat.code,
        }));
        setCategoryList(mapped);
      },
      (err) => console.error("Failed to load categories", err)
    );
  }, []);

  const filteredCategories = useMemo(
    () =>
      categoryList.filter((cat) =>
        cat.label.toLowerCase().includes(search.toLowerCase())
      ),
    [search, categoryList]
  );

  const isAllSelected =
    categoryList.length > 0 &&
    categoryList.every((cat) => selectedCategories.includes(cat.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onCategoryChange([]);
    } else {
      onCategoryChange(categoryList.map((cat) => cat.id));
    }
  };

  const toggleCategory = (id) => {
    onCategoryChange(
      selectedCategories.includes(id)
        ? selectedCategories.filter((item) => item !== id)
        : [...selectedCategories, id]
    );
  };

  function openCatalogList() {
    setSelectedCatalogCategory(null);
    setCatalogOpen(true);
  }

  function openCatalogDetail(cat) {
    setSelectedCatalogCategory(cat);
    setCatalogOpen(true);
  }

  function closeCatalog() {
    setCatalogOpen(false);
    setSelectedCatalogCategory(null);
  }

  return (
    <>
      <div style={styles.categorySection}>
        <div style={styles.headerContainer}>
          <div style={styles.categoryHeader}>
            <span style={styles.categoryTitle}>
              Select Step Category{" "}
              <span style={styles.categorySubtitle}>(You can select multiple)</span>
              <span style={styles.asterisk}>*</span>
            </span>
          </div>
          <p style={styles.categoryDescription}>
            Select one or more categories where this step should be available, such as Build, Deploy, Integration, or K8s operations. This helps users find and use the step in the right job template context.
            <a
              href="#"
              style={styles.categoryLink}
              onClick={(e) => { e.preventDefault(); openCatalogList(); }}
            >
              More Info
            </a>
          </p>
        </div>

        <div style={styles.searchWrapper}>
          {/* <i className="ri-search-line" style={styles.searchIcon} /> */}
          <span style={styles.searchIcon} className="ri-search-line" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
            data-testid="step-search-input"
          />
        </div>

        {error && <p style={styles.errorMessage}>{error}</p>}

        <div style={styles.checkboxContainer} data-testid="step-checkbox-container">
          <label style={styles.selectAllRow}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              style={styles.checkbox}
            />
            <span style={styles.labelText}>Select All</span>
          </label>

          <div style={styles.categoriesBox}>
            {categoryList.length === 0 ? (
              <p style={{ fontSize: "var(--font-13)", color: "#6B7280", padding: "var(--space-8) 0" }}>
                Loading categories...
              </p>
            ) : (
              filteredCategories.map((cat) => (
                <label key={cat.id} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    style={styles.checkbox}
                  />
                  <span style={styles.labelText}>{cat.label}</span>
                  <a
                    href="#"
                    style={styles.moreInfoLink}
                    onClick={(e) => { e.preventDefault(); openCatalogDetail(cat); }}
                  >
                    More Info
                  </a>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <StepCatalogModal
        isOpen={catalogOpen}
        onClose={closeCatalog}
        defaultCategory={selectedCatalogCategory}
      />
    </>
  );
};

SelectStepCategory.propTypes = {
  selectedCategories: PropTypes.array.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  error: PropTypes.string,
};

// ─── BasicInfo Panel ──────────────────────────────────────────────────────────
const BasicInfo = ({ inherits, prev_state }) => {
  const [state, setState] = useState(prev_state || getBasicInfoDefaultState());

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getBasicInfoDefaultState(), s, prev_state));

    }
  }, [prev_state]);

  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      const errors = {};
      if (!state.data.step_name?.trim()) errors.step_name = "Step Name is required";
      if (!state.data.step_code?.trim()) errors.step_code = "Step Code is required";
      if (!state.data.step_description?.trim()) errors.step_description = "Step Description is required";
      if (!state.data.step_categories?.length) errors.step_categories = "Please select at least one category";
      if (Object.keys(errors).length > 0) {
        setState((s) => ({ ...s, error: errors }));
        return { valid: false };
      }
      return { valid: true };
    };
  }

  function onChangeHandler(e) {
    const { name, value } = e.target;
    setState((s) => ({
      ...s,
      data: { ...s.data, [name]: value },
      error: { ...s.error, [name]: "" },
    }));
  }

  function onVersionSelect(versionId) {
    setState((s) => ({ ...s, data: { ...s.data, step_version: versionId } }));
  }

  function onCategoryChange(newValues) {
    setState((s) => ({
      ...s,
      data: { ...s.data, step_categories: newValues },
      error: { ...s.error, step_categories: "" },
    }));
  }

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)" }}>
      <p style={{ fontSize: "var(--font-14)", fontWeight: "var(--font-weight-600)", color: "var(--color-content-primary)", marginBottom: "var(--space-24)" }}>
        Please fill the following details
      </p>

      <div style={{ marginBottom: "var(--space-20)" }}>
        <Input type="text" label="Step Name" name="step_name" placeholder="Enter"
          data={state.data} error={state.error} onChangeHandler={onChangeHandler}
          mandatorySign info="A Step is a reusable action in BuildPiper that performs a specific operation such as build, deployment, scanning, notification, integration, or automation. Steps are added inside a Job Template in a defined sequence, so BuildPiper knows what actions to run and in what order during manual build/deploy flows or CI/CD workflows." />
      </div>

      <div style={{ marginBottom: "var(--space-20)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <label style={{ fontSize: "var(--font-14)", fontWeight: "var(--font-weight-500)", color: "var(--color-content-primary)" }}>
            Step Version
          </label>
          <Tooltip TransitionComponent={Zoom} title="Choose how this step should be configured and executed." placement="right" arrow>
            <i className="ri-information-line font-14 color-secondary" />
          </Tooltip>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-16)" }}>
          {VERSION_OPTIONS.map((v) => {
            const isSelected = state.data.step_version === v.id;
            return (
              <div key={v.id} role="button" tabIndex={0}
                onClick={() => onVersionSelect(v.id)}
                onKeyDown={(e) => e.key === "Enter" && onVersionSelect(v.id)}
                data-testid="step-version-select"
                style={{
                  border: isSelected ? "2px solid var(--color-primary-500)" : "2px solid var(--color-grey-300)",
                  borderRadius: "var(--radius-8)", padding: "var(--space-16)",
                  cursor: "pointer", outline: "none",
                  backgroundColor: isSelected ? "var(--color-pastel-blue-3)" : "var(--color-white)",
                  transition: "border 0.15s",
                }}
              >
                <span style={{
                  display: "inline-block",
                  backgroundColor: isSelected ? "var(--color-success-600)" : "var(--color-primary-500)",
                  color: "var(--color-white)", fontSize: "var(--font-12)",
                  fontWeight: "var(--font-weight-600)", padding: "var(--space-2) var(--space-10)",
                  borderRadius: "var(--radius-4)", marginBottom: "var(--space-12)",
                }}>
                  {v.label}
                </span>
                <p style={{ fontSize: "var(--font-12)", color: "var(--color-content-secondary)", margin: 0, lineHeight: "var(--line-height-20)" }}>
                  {v.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-20)" }}>
        <Input type="text" label="Step Code (Must be unique)" name="step_code" placeholder="Enter"
          data={state.data} error={state.error} onChangeHandler={onChangeHandler}
          mandatorySign info="Enter a unique code for this step. This code is used internally to identify and execute the step." />
      </div>

      <div style={{ marginBottom: "var(--space-20)" }}>
        <Input type="text" label="Step Description" name="step_description" placeholder="Enter"
          data={state.data} error={state.error} onChangeHandler={onChangeHandler}
          mandatorySign info="Describe what this step does, when it should be used, and what output it produces. Keep it simple so users can understand the purpose before adding it to a job template. Example: This step builds a Docker image from the service source code and pushes it to the configured container registry." />
      </div>

      <SelectStepCategory
        selectedCategories={state.data.step_categories}
        onCategoryChange={onCategoryChange}
        error={state.error.step_categories}
      />
    </div>
  );
};

BasicInfo.propTypes = {
  inherits: PropTypes.object,
  prev_state: PropTypes.object,
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  categorySection: { border: "1px solid #E5E7EB", borderRadius: "12px", overflow: "hidden", background: "#fff", marginBottom: "20px" },
  headerContainer: { padding: "20px", backgroundColor: "#FAFAFA", borderBottom: "1px solid #E5E7EB" },
  categoryHeader: { marginBottom: "12px" },
  categoryTitle: { fontSize: "14px", fontWeight: 700, color: "#2f2f2f" },
  categorySubtitle: { fontSize: "14px", fontWeight: 700, color: "#2f2f2f" },
  asterisk: { color: "#EF4444" },
  categoryDescription: { fontSize: "14px", fontWeight: 400, lineHeight: "24px", color: "#2f2f2f", margin: 0 },
  categoryLink: { color: "rgba(0, 134, 255, 1)", textDecoration: "none", fontWeight: 600, cursor: "pointer" },
  searchWrapper: {
    margin: "var(--space-20)",
    position: "relative",  
    display: "flex",        
    alignItems: "center",   
  },

  searchIcon: {
    position: "absolute",
    left: "var(--space-18)",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "var(--font-18)",
    color: "#6B7280",
    pointerEvents: "none",
    zIndex: 1,            
  },

  searchInput: {
    width: "100%",
    height: "var(--space-44)",
    padding: "0 16px 0 50px",  
    border: "1px solid #D1D5DB",
    borderRadius: "var(--radius-8)",
    fontSize: "var(--font-18)",
    outline: "none",
    boxSizing: "border-box",
  },
  checkboxContainer: { padding: "var(--space-0) var(--space-18) var(--space-4)" },
  selectAllRow: { display: "flex", alignItems: "center", gap: "var(--space-16)", paddingBottom: "var(--space-12)", borderBottom: "1px solid #E5E7EB", marginBottom: "var(--space-12)" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "var(--space-12)", fontSize: "var(--font-18)", color: "#4B5563", cursor: "pointer", minHeight: "var(--space-40)" },
  checkbox: { width: "var(--space-20)", height: "var(--space-20)", accentColor: "rgba(0, 134, 255, 1)", cursor: "pointer", flexShrink: 0 },
  labelText: { fontSize: "var(--font-14)", fontWeight: 500, color: "#2f2f2f" },
  moreInfoLink: { color: "rgba(0, 134, 255, 1)", textDecoration: "none", fontSize: "var(--font-12)", fontWeight: 600, cursor: "pointer" },
  categoriesBox: { maxHeight: "var(--space-230)", overflowY: "auto", display: "flex", flexDirection: "column", paddingRight: "var(--space-8)" },
  errorMessage: { color: "#EF4444", fontSize: "var(--font-12)", margin: " 0 var(--space-4) var(--space-24)" },
};

export default BasicInfo;

RUNTIME.JS

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Input } from "../../../../components/genericComponents/Input";
import StepCatalogModal from "./CreateStepDialog";

export function getRuntimeDefaultState() {
  return {
    data: {
      step_type: "dockerize",
      docker_image_with_tag: "",
      entry_commands: [""],
    },
    error: {},
  };
}
// Generic safe merge helper — put this in a shared util or inline per component
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

const Runtime = ({ inherits, prev_state, extraProps }) => {
  const [state, setState] = useState(prev_state || getRuntimeDefaultState());
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getRuntimeDefaultState(), s, prev_state));
    }
  }, [prev_state]);

  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      const errors = {};
      if (
        state.data.step_type === "dockerize" &&
        !state.data.docker_image_with_tag?.trim()
      ) {
        errors.docker_image_with_tag = "Docker Image With Tag is required";
      }
      if (!state.data.entry_commands.length) {
        errors.entry_commands = "At least one command is required";
      } else if (state.data.entry_commands.some((cmd) => !cmd?.trim())) {
        errors.entry_commands = "All command fields must be filled";
      }
      if (Object.keys(errors).length > 0) {
        setState((s) => ({ ...s, error: errors }));
        return { valid: false };
      }
      return { valid: true };
    };
  }

  function onChangeHandler(e) {
    const { name, value } = e.target;
    setState((s) => ({
      ...s,
      data: { ...s.data, [name]: value },
      error: { ...s.error, [name]: "" },
    }));
  }

  function onStepTypeChange(type) {
    setState((s) => ({
      ...s,
      data: { ...s.data, step_type: type },
      error: { ...s.error, step_type: "" },
    }));

    // Notify parent to rebuild the visible panel list — same pattern as
    // EventTypePanel calling extraProps.setEventCategory in PipelineNotificationRule
    if (extraProps?.setStepType) {
      extraProps.setStepType(type);
    }
  }

  function onCommandChange(index, value) {
    const updated = [...state.data.entry_commands];
    updated[index] = value;
    setState((s) => ({
      ...s,
      data: { ...s.data, entry_commands: updated },
      error: { ...s.error, entry_commands: "" },
    }));
  }

  function addCommand() {
    setState((s) => ({
      ...s,
      data: { ...s.data, entry_commands: [...s.data.entry_commands, ""] },
    }));
  }

  function removeCommand(index) {
    setState((s) => ({
      ...s,
      data: {
        ...s.data,
        entry_commands: s.data.entry_commands.filter((_, i) => i !== index),
      },
    }));
  }

  const isDockerize = state.data.step_type === "dockerize";

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2f2f2f", marginBottom: "24px" }}>
        Please fill the following details
      </p>

      {/* ══ Step Type Card ══ */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardTitle}>Step Type</p>
          <p style={styles.cardDesc}>
            Choose how this step will execute. Select Dockerize if the step should run inside a
            Docker container using a defined image. Select Non-Dockerize if the step should run
            directly in the VM/execution environment without a Docker container.{" "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }}
              style={{ color: "#1677FF", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}
            >
              Know More
            </a>
          </p>
        </div>

        <div style={styles.radioRow}>
          {/* Dockerize */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onStepTypeChange("dockerize")}
            onKeyDown={(e) => e.key === "Enter" && onStepTypeChange("dockerize")}
            style={{
              ...styles.radioCard,
              border: isDockerize ? "2px solid #1677FF" : "2px solid #E5E7EB",
              backgroundColor: isDockerize ? "#EBF5FF" : "#fff",
            }}
            data-testid="step-type-dockerize"
          >
            <input
              type="radio"
              checked={isDockerize}
              onChange={() => onStepTypeChange("dockerize")}
              style={styles.radioInput}
              onClick={(e) => e.stopPropagation()}
            />
            <div>
              <p style={styles.radioTitle}>Dockerize</p>
              <p style={styles.radioDesc}>
                Runs inside a Docker container with required mounts, workspace access, credentials,
                and runtime dependencies.
              </p>
            </div>
          </div>

          {/* Non-Dockerize */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onStepTypeChange("non_dockerize")}
            onKeyDown={(e) => e.key === "Enter" && onStepTypeChange("non_dockerize")}
            style={{
              ...styles.radioCard,
              border: !isDockerize ? "2px solid #1677FF" : "2px solid #E5E7EB",
              backgroundColor: !isDockerize ? "#EBF5FF" : "#fff",
            }}
            data-testid="step-type-non-dockerize"
          >
            <input
              type="radio"
              checked={!isDockerize}
              onChange={() => onStepTypeChange("non_dockerize")}
              style={styles.radioInput}
              onClick={(e) => e.stopPropagation()}
            />
            <div>
              <p style={styles.radioTitle}>Non-Dockerized</p>
              <p style={styles.radioDesc}>
                Runs directly in the platform or VM execution environment without a custom step
                container.
              </p>
            </div>
          </div>
        </div>

        {isDockerize && (
          <div style={styles.dockerImageSection}>
            <Input
              type="text"
              label="Docker Image With Tag"
              name="docker_image_with_tag"
              placeholder="Enter"
              data={state.data}
              error={state.error}
              onChangeHandler={onChangeHandler}
              mandatorySign
              info="Required when Dockerize is selected. Enter the full Docker image name with tag."
            />
          </div>
        )}
      </div>

      {/* ══ Entry Commands Card ══ */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <p style={styles.cardTitle}>
            Entry Commands<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span>
          </p>
          <p style={styles.cardDesc}>
            Enter the command that should run when this step starts.{" "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setCatalogOpen(true); }}
              style={{ color: "rgba(0, 134, 255, 1)", textDecoration: "none", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
            >
              Know More
            </a>
          </p>
        </div>

        <div style={styles.commandsBody}>
          <p style={styles.commandsLabel}>Commands</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {state.data.entry_commands.map((cmd, index) => (
              <div key={index} style={styles.commandRow}>
                <div style={{ flex: 1 }}>
                  <Input
                    type="text"
                    name={`cmd_${index}`}
                    placeholder=""
                    data={{ [`cmd_${index}`]: cmd }}
                    error={
                      state.error.entry_commands
                        ? { [`cmd_${index}`]: state.error.entry_commands }
                        : {}
                    }
                    onChangeHandler={(e) => onCommandChange(index, e.target.value)}
                  />
                </div>
                <button onClick={() => removeCommand(index)} style={styles.deleteBtn} title="Remove">
                  <span className="ri-delete-bin-7-line" style={{ fontSize: "20px", color: "#EF4444" }} />
                </button>
              </div>
            ))}
          </div>
          <button style={styles.addAnotherBtn} onClick={addCommand}>
            ADD ANOTHER
          </button>
        </div>
      </div>

      <StepCatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
  );
};

Runtime.propTypes = {
  inherits: PropTypes.object,
  prev_state: PropTypes.object,
  extraProps: PropTypes.object,
};

const styles = {
  card: {
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-12)",
    overflow: "hidden",
    backgroundColor: "var(--color-white)",
    marginBottom: "var(--space-20)",
  },
  cardHeader: {
    backgroundColor: "var(--color-grey-000)",
    padding: "var(--space-16) var(--space-24)",
    borderBottom: "1px solid var(--color-border-grey)",
  },
  cardTitle: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-6) 0",
  },
  cardDesc: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
    margin: 0,
    lineHeight: "var(--line-height-1-5)",
  },
  radioRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--space-16)",
    padding: "var(--space-16) var(--space-24)",
  },
  radioCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-12)",
    borderRadius: "var(--radius-8)",
    padding: "var(--space-16)",
    cursor: "pointer",
    transition: "border var(--transition-fast), background-color var(--transition-fast)",
    outline: "none",
  },
  radioInput: {
    width: "18px",
    height: "18px",
    accentColor: "var(--color-tertiary-500)",
    cursor: "pointer",
    flexShrink: 0,
    marginTop: "2px",
  },
  radioTitle: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-600)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-4) 0",
  },
  radioDesc: {
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-400)",
    color: "var(--color-content-primary)",
    margin: 0,
    lineHeight: "var(--line-height-20)",
  },
  dockerImageSection: {
    padding: "var(--space-16) var(--space-24) var(--space-20)",
  },
  commandsBody: {
    padding: "var(--space-16) var(--space-24) var(--space-20)",
  },
  commandsLabel: {
    fontSize: "var(--font-13)",
    fontWeight: "var(--font-weight-600)",
    color: "var(--color-content-primary)",
    margin: "0 0 var(--space-12) 0",
  },
  commandRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-10)",
  },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    border: "1px solid var(--color-border-grey)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
    marginTop: "2px",
    marginBottom: "var(--space-18)",
  },
  addAnotherBtn: {
    marginTop: "var(--space-6)",
    padding: "var(--space-8) var(--space-16)",
    border: "1px solid var(--color-primary-300)",
    borderRadius: "var(--radius-6)",
    backgroundColor: "var(--color-white)",
    fontSize: "var(--font-12)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-primary-500)",
    cursor: "pointer",
    letterSpacing: "0.4px",
  },
};

export default Runtime;

LIMITS.JS

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Tooltip } from "@mui/material";
import {Box as MuiBox} from "@mui/material";
import Zoom from "@mui/material/Zoom";
import { Input } from "../../../../components/genericComponents/Input";

const CPU_LIMIT_OPTIONS = [
  { id: "0.5", label: "0.5 CPU" },
  { id: "1", label: "1 CPU" },
  { id: "2", label: "2 CPU" },
  { id: "4", label: "4 CPU" },
  { id: "8", label: "8 CPU" },
];

export function getLimitDefaultState() {
  return {
    data: { impose_restriction: true, cpu_limit: "", memory_limit: "" },
    error: {},
  };
}
// Generic safe merge helper — put this in a shared util or inline per component
function safeMerge(defaultState, current, incoming) {
  return {
    ...current,
    ...incoming,
    data: {
      ...defaultState.data,
      ...current.data,
      ...(incoming.data ?? {}),
    },
    error: incoming.error ?? current.error,
  };
}

export const Limit = ({ inherits, prev_state }) => {
  const [state, setState] = useState(prev_state || getLimitDefaultState());

  useEffect(() => {
    if (prev_state) {
      setState((s) => safeMerge(getLimitDefaultState(), s, prev_state));
    }
  }, [prev_state]);


  if (inherits) {
    inherits.getState = () => state;
    inherits.validateForm = () => {
      const errors = {};
      if (state.data.impose_restriction && !state.data.cpu_limit) errors.cpu_limit = "CPU Limit is required";
      if (Object.keys(errors).length > 0) { setState((s) => ({ ...s, error: errors })); return { valid: false }; }
      return { valid: true };
    };
  }

  function onChangeHandler(e) {
    const { name, value } = e.target;
    setState((s) => ({ ...s, data: { ...s.data, [name]: value }, error: { ...s.error, [name]: "" } }));
  }

  return (
    <div style={{ padding: "var(--space-20) var(--space-0)",height:"var(--space-340)" }}>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#2f2f2f", marginBottom: "24px" }}>Please fill the following details</p>

      <div style={limStyles.toggleRow} data-testid="step-limit-switch">
        <p style={limStyles.toggleLabel}>Do you want to impose resource-based restriction?</p>
        <Tooltip title={state.data.impose_restriction ? "Click to disable" : "Click to enable"} arrow placement="top">
          <MuiBox className="switch-input-wrapper-v2 d-flex align-center" sx={{ "& .input-component": { marginBottom: "var(--space-0)" } }}>
            <Input type="only-switch" name="impose_restriction"
              onChangeHandler={(e) => setState((s) => ({ ...s, data: { ...s.data, impose_restriction: e.target.checked }, error: { ...s.error, cpu_limit: "", memory_limit: "" } }))}
              data={{ impose_restriction: state.data.impose_restriction }} error={{}} />
          </MuiBox>
        </Tooltip>
      </div>

      {state.data.impose_restriction && (
        <div style={limStyles.fieldsRow}>
          <div style={limStyles.fieldCol}>
            <div style={limStyles.fieldLabelRow}>
              <label style={limStyles.fieldLabel}>CPU Limit<span style={{ color: "#EF4444", marginLeft: "2px" }}>*</span></label>
              <Tooltip TransitionComponent={Zoom} title="Select the maximum CPU that this step can use while running. Choose a limit based on the expected workload. For lightweight notification or integration steps, use a smaller value. For build, scan, or image creation steps, use a higher value." placement="right" arrow>
                <i className="ri-information-line" style={{ fontSize: "14px", color: "#6B7280", cursor: "pointer" }} />
              </Tooltip>
            </div>
            <Input type="select" name="cpu_limit" data={state.data} error={state.error}
              list={CPU_LIMIT_OPTIONS} renderAsSelect select_default_value="Select"
              onChangeHandler={onChangeHandler} />
          </div>
          <div style={limStyles.fieldCol}>
            <div style={limStyles.fieldLabelRow}>
              <label style={limStyles.fieldLabel}>Memory Limit</label>
              <Tooltip TransitionComponent={Zoom} title="Enter the maximum memory allowed for this step. This helps prevent the step from consuming too much memory and affecting other pipeline executions. Use higher memory for Docker builds, scanners, large test suites, or heavy deployment operations." placement="right" arrow>
                <i className="ri-information-line" style={{ fontSize: "14px", color: "#6B7280", cursor: "pointer" }} />
              </Tooltip>
            </div>
            <Input type="text" name="memory_limit" placeholder="Enter"
              data={state.data} error={state.error} onChangeHandler={onChangeHandler} />
          </div>
        </div>
      )}
    </div>
  );
};

Limit.propTypes = { inherits: PropTypes.object, prev_state: PropTypes.object };

const limStyles = {
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-16)",
    marginBottom: "var(--space-28)",
  },
  toggleLabel: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-700)",
    color: "var(--color-content-primary)",
    margin: 0,
  },
  fieldsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--space-24)",
  },
  fieldCol: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6)",
  },
  fieldLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-6)",
  },
  fieldLabel: {
    fontSize: "var(--font-14)",
    fontWeight: "var(--font-weight-500)",
    color: "var(--color-content-primary)",
  },
};

export default Limit;


