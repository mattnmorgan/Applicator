"use client";

import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import SettingManager from "@/lib/client/managers/setting";
import Banner from "@/lib/components/utility/Banner";
import AppletSettingManager from "@/lib/client/managers/appletSetting";
import DynamicInput from "@/lib/components/utility/DynamicInput/DynamicInput";
import Button from "@/lib/components/utility/Button/Button";
import ButtonIcon from "@/lib/components/utility/ButtonIcon";
import StickyFooter from "@/lib/components/utility/StickyFooter";
import Icon from "@/lib/components/utility/Icon";
import type { DynamicInputDefinition } from "@/lib/components/utility/DynamicInput/types/dynamic-input-definition";
import styles from "./page.module.css";

interface SettingDefinition {
  name: string;
  label: string;
  type:
    | "select"
    | "multiselect"
    | "radio"
    | "pseudoassignee"
    | "multipseudoassignee"
    | "checkbox"
    | "text"
    | "date"
    | "datetime"
    | "time"
    | "number"
    | "range"
    | "rangeslider"
    | "color"
    | "checklist"
    | "icon"
    | "file"
    | "password";
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
  decimalPlaces?: number;
  format?: string;
  lines?: number;
  resizable?: boolean;
  searchable?: boolean;
  options?: {
    value: string;
    label: string;
    description?: string;
    icon?: string;
  }[];
}

interface AppletInfo {
  id: string;
  label: string;
  description: string;
  app: string;
  appLabel: string;
  target: string;
  poppable?: boolean;
  icon?: string | null;
  settings?: SettingDefinition[];
}

interface PinnedInstance {
  instanceId: string;
  appletId: string;
  label: string;
  customLabel: string;
  description: string;
  app: string;
  appLabel: string;
  settings?: SettingDefinition[];
}

interface UtilityBarInstance {
  appletId: string;
  label: string;
  description: string;
  app: string;
  appLabel: string;
  poppable: boolean;
}

interface AddAppletModalProps {
  availableApplets: AppletInfo[];
  onAdd: (appletId: string, customLabel: string, settingsValues: Record<string, any>) => void;
  onClose: () => void;
}

function AddAppletModal({
  availableApplets,
  onAdd,
  onClose,
}: AddAppletModalProps) {
  const [step, setStep] = useState<"select" | "configure">("select");
  const [search, setSearch] = useState("");
  const [selectedApplet, setSelectedApplet] = useState<AppletInfo | null>(null);
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, any>>({});

  const filtered = availableApplets.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.appLabel.toLowerCase().includes(q)
    );
  });

  const handleSelectNext = () => {
    if (!selectedApplet) return;
    const defs = selectedApplet.settings || [];
    const initial: Record<string, any> = {};
    for (const def of defs) {
      initial[def.name] =
        def.defaultValue !== undefined
          ? def.defaultValue
          : def.type === "checkbox"
          ? false
          : def.type === "multiselect" || def.type === "multipseudoassignee"
          ? []
          : "";
    }
    setLabel(selectedApplet.label);
    setValues(initial);
    setStep("configure");
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleSave = () => {
    if (!selectedApplet) return;
    onAdd(selectedApplet.id, label || selectedApplet.label, values);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {step === "select" ? "Add Applet" : selectedApplet?.label}
          </h3>
          <ButtonIcon name="close" label="Close" onClick={onClose} iconSize={20} />
        </div>

        {step === "select" && (
          <>
            <div style={{ padding: "12px 24px 0" }}>
              <input
                className={styles.settingInput}
                type="text"
                placeholder="Search applets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div className={styles.modalBody}>
              {filtered.length === 0 ? (
                <div className={styles.emptyState}>No applets match your search.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {filtered.map((applet) => {
                    const isSelected = selectedApplet?.id === applet.id;
                    return (
                      <label
                        key={applet.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: isSelected ? "#1e3a5f" : "transparent",
                          border: `1px solid ${isSelected ? "#3b82f6" : "#1e293b"}`,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="radio"
                          name="addAppletSelect"
                          checked={isSelected}
                          onChange={() => setSelectedApplet(applet)}
                          style={{ accentColor: "#3b82f6", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: 500, color: "#f1f5f9" }}>
                            {applet.label}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            {applet.description}
                          </div>
                        </div>
                        <div
                          style={{
                            background: "#1e40af",
                            color: "#93c5fd",
                            fontSize: "11px",
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {applet.appLabel}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleSelectNext} disabled={!selectedApplet}>
                Next
              </Button>
            </div>
          </>
        )}

        {step === "configure" && selectedApplet && (
          <>
            <div className={styles.modalBody}>
              <div className={styles.settingField}>
                <label className={styles.settingLabel}>Label</label>
                <input
                  className={styles.settingInput}
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              {(selectedApplet.settings || []).map((def) => {
                const inputDef: DynamicInputDefinition = {
                  id: def.name,
                  label: def.label,
                  type: def.type,
                  defaultValue: def.defaultValue,
                  required: def.required,
                  placeholder: def.placeholder,
                  min: def.min,
                  max: def.max,
                  step: def.step,
                  decimalPlaces: def.decimalPlaces,
                  format: def.format,
                  lines: def.lines,
                  resizable: def.resizable,
                  searchable: def.searchable,
                  options: def.options,
                };
                return (
                  <div key={def.name} style={{ paddingBottom: "12px" }}>
                    <DynamicInput
                      input={inputDef}
                      value={values[def.name]}
                      onChange={(id, value) =>
                        setValues((prev) => ({ ...prev, [id]: value }))
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div className={styles.modalFooter}>
              <Button variant="secondary" onClick={handleBack}>Back</Button>
              <Button variant="primary" onClick={handleSave}>Save</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface AddUtilityAppletModalProps {
  availableApplets: AppletInfo[];
  currentAppletIds: string[];
  onAdd: (appletId: string) => void;
  onClose: () => void;
}

function AddUtilityAppletModal({
  availableApplets,
  currentAppletIds,
  onAdd,
  onClose,
}: AddUtilityAppletModalProps) {
  const notYetAdded = availableApplets.filter(
    (a) => !currentAppletIds.includes(a.id),
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Utility Bar Applet</h3>
          <ButtonIcon name="close" label="Close" onClick={onClose} iconSize={20} />
        </div>
        <div className={styles.modalBody}>
          {notYetAdded.length === 0 ? (
            <div className={styles.emptyState}>
              No utility bar applets available to add.
            </div>
          ) : (
            notYetAdded.map((applet) => (
              <div key={applet.id} className={styles.addAppletRow}>
                <div className={styles.checkboxContent}>
                  <span className={styles.checkboxLabel}>{applet.label}</span>
                  <span className={styles.checkboxDescription}>
                    {applet.description}
                    {applet.poppable && (
                      <span style={{ color: "#3b82f6", marginLeft: "6px" }}>
                        · Poppable
                      </span>
                    )}
                  </span>
                </div>
                <Button variant="primary" onClick={() => onAdd(applet.id)}>
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SettingsModalProps {
  instance: PinnedInstance;
  currentValues: Record<string, any>;
  currentLabel: string;
  onSave: (
    instanceId: string,
    label: string,
    values: Record<string, any>,
  ) => void;
  onClose: () => void;
}

function SettingsModal({
  instance,
  currentValues,
  currentLabel,
  onSave,
  onClose,
}: SettingsModalProps) {
  const definitions = instance.settings || [];
  const [label, setLabel] = useState(currentLabel);
  const [values, setValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const def of definitions) {
      initial[def.name] =
        currentValues[def.name] !== undefined
          ? currentValues[def.name]
          : def.defaultValue !== undefined
            ? def.defaultValue
            : def.type === "checkbox"
              ? false
              : def.type === "multiselect" || def.type === "multipseudoassignee"
                ? []
                : "";
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(instance.instanceId, label, values);
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{instance.label} Settings</h3>
          <ButtonIcon name="close" label="Close" onClick={onClose} iconSize={20} />
        </div>
        <div className={styles.modalBody}>
          <div className={styles.settingField}>
            <label className={styles.settingLabel}>Label</label>
            <input
              className={styles.settingInput}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {definitions.map((def) => {
            const inputDef: DynamicInputDefinition = {
              id: def.name,
              label: def.label,
              type: def.type,
              defaultValue: def.defaultValue,
              required: def.required,
              placeholder: def.placeholder,
              min: def.min,
              max: def.max,
              step: def.step,
              decimalPlaces: def.decimalPlaces,
              format: def.format,
              lines: def.lines,
              resizable: def.resizable,
              searchable: def.searchable,
              options: def.options,
            };
            return (
              <div key={def.name} style={{ paddingBottom: "12px" }}>
                <DynamicInput
                  input={inputDef}
                  value={values[def.name]}
                  onChange={(id, value) =>
                    setValues((prev) => ({ ...prev, [id]: value }))
                  }
                />
              </div>
            );
          })}
        </div>
        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const DENSITY_OPTIONS: { value: "full" | "name" | "icon"; label: string; description: string }[] = [
  { value: "full", label: "Full", description: "Show applet icon and name" },
  { value: "name", label: "Name Only", description: "Show only the applet name" },
  { value: "icon", label: "Icon Only", description: "Show only the applet icon" },
];

export default function HomeSettingsPage() {
  // Pinned applets state
  const [pinnedInstances, setPinnedInstances] = useState<PinnedInstance[]>([]);
  const [instanceSettings, setInstanceSettings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [availableApplets, setAvailableApplets] = useState<AppletInfo[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [appDensity, setAppDensity] = useState<"full" | "name" | "icon">("full");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<PinnedInstance | null>(null);

  // Utility bar state
  const [utilityBarApplets, setUtilityBarApplets] = useState<UtilityBarInstance[]>([]);
  const [availableUtilityApplets, setAvailableUtilityApplets] = useState<AppletInfo[]>([]);
  const [utilityBarDensity, setUtilityBarDensity] = useState<"full" | "name" | "icon">("full");
  const [isAddUtilityModalOpen, setIsAddUtilityModalOpen] = useState(false);

  // Shared state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const userRes = await fetch("/api/system/settings/user");
      if (!userRes.ok) throw new Error("Failed to fetch user data");
      const userData = await userRes.json();
      const currentUserId = userData.user.id;
      setUserId(currentUserId);

      // ── Pinned applets ──────────────────────────────────────────────────────
      const homeApplets = (userData.userApplets || []).filter(
        (a: AppletInfo) => a.target === "home",
      );
      setAvailableApplets(homeApplets);

      const appletMap = new Map<string, AppletInfo>();
      for (const applet of homeApplets) {
        appletMap.set(applet.id, applet);
      }

      const settingManager = new SettingManager();

      const densityRecord = await settingManager.readRecord({
        id: `${currentUserId}:home:appDensity`,
      });
      const loadedDensity = densityRecord?.data.value;
      if (loadedDensity && ["full", "name", "icon"].includes(loadedDensity)) {
        setAppDensity(loadedDensity as "full" | "name" | "icon");
      }

      const setting = await settingManager.readRecord({
        id: `${currentUserId}:home:applets`,
      });

      if (setting?.data.value) {
        try {
          const instances = JSON.parse(setting.data.value);
          if (Array.isArray(instances)) {
            const pinned: PinnedInstance[] = [];
            const settingsMap: Record<string, Record<string, any>> = {};
            const appletSettingManager = new AppletSettingManager();

            for (const inst of instances) {
              const applet = appletMap.get(inst.appletId);
              if (applet) {
                let instanceSettingsData: Record<string, any> = {};
                let customLabel = applet.label;

                try {
                  const settingRecord = await appletSettingManager.readRecord({
                    id: inst.instanceId,
                  });
                  if (settingRecord) {
                    instanceSettingsData = settingRecord.data.settings || {};
                    if (settingRecord.data.label) customLabel = settingRecord.data.label;
                  }
                } catch {
                  // No settings yet
                }

                pinned.push({
                  instanceId: inst.instanceId,
                  appletId: inst.appletId,
                  label: applet.label,
                  customLabel,
                  description: applet.description,
                  app: applet.app,
                  appLabel: applet.appLabel,
                  settings: applet.settings,
                });
                settingsMap[inst.instanceId] = instanceSettingsData;
              }
            }

            setPinnedInstances(pinned);
            setInstanceSettings(settingsMap);
          }
        } catch {
          setPinnedInstances([]);
        }
      }

      // ── Utility bar applets ─────────────────────────────────────────────────
      const utilityApplets = (userData.userApplets || []).filter(
        (a: AppletInfo) => a.target === "utility-bar",
      );
      setAvailableUtilityApplets(utilityApplets);

      const utilityAppletMap = new Map<string, AppletInfo>();
      for (const applet of utilityApplets) {
        utilityAppletMap.set(applet.id, applet);
      }

      const utilityDensityRecord = await settingManager.readRecord({
        id: `${currentUserId}:ui:utilityBarDensity`,
      });
      const loadedUtilityDensity = utilityDensityRecord?.data.value;
      if (loadedUtilityDensity && ["full", "name", "icon"].includes(loadedUtilityDensity)) {
        setUtilityBarDensity(loadedUtilityDensity as "full" | "name" | "icon");
      }

      const utilityBarRecord = await settingManager.readRecord({
        id: `${currentUserId}:ui:utilityBar`,
      });

      if (utilityBarRecord?.data.value) {
        try {
          const ids: string[] = JSON.parse(utilityBarRecord.data.value);
          if (Array.isArray(ids)) {
            const instances: UtilityBarInstance[] = [];
            for (const id of ids) {
              const applet = utilityAppletMap.get(id);
              // Only keep applets the user still has access to
              if (applet) {
                instances.push({
                  appletId: applet.id,
                  label: applet.label,
                  description: applet.description,
                  app: applet.app,
                  appLabel: applet.appLabel,
                  poppable: applet.poppable ?? false,
                });
              }
            }
            setUtilityBarApplets(instances);
          }
        } catch {
          setUtilityBarApplets([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // ── Pinned applet handlers ─────────────────────────────────────────────────

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(pinnedInstances);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setPinnedInstances(items);
  };

  const handleRemove = async (instanceId: string) => {
    setPinnedInstances(pinnedInstances.filter((a) => a.instanceId !== instanceId));
    try {
      const appletSettingManager = new AppletSettingManager();
      await appletSettingManager.deleteRecord(instanceId);
    } catch {
      // Settings may not exist
    }
    const newSettings = { ...instanceSettings };
    delete newSettings[instanceId];
    setInstanceSettings(newSettings);
  };

  const handleAddApplet = (appletId: string, customLabel: string, settingsValues: Record<string, any>) => {
    const applet = availableApplets.find((a) => a.id === appletId);
    if (!applet) return;
    const instanceId = crypto.randomUUID();
    setPinnedInstances([
      ...pinnedInstances,
      {
        instanceId,
        appletId: applet.id,
        label: applet.label,
        customLabel,
        description: applet.description,
        app: applet.app,
        appLabel: applet.appLabel,
        settings: applet.settings,
      },
    ]);
    setInstanceSettings((prev) => ({ ...prev, [instanceId]: settingsValues }));
    setIsAddModalOpen(false);
  };

  const handleSaveSettings = async (
    instanceId: string,
    label: string,
    values: Record<string, any>,
  ) => {
    try {
      const appletSettingManager = new AppletSettingManager();
      const instance = pinnedInstances.find((i) => i.instanceId === instanceId);
      if (!instance) return;

      await appletSettingManager.upsertRecord(instanceId, {
        user: userId,
        applet: instance.appletId,
        label,
        settings: values,
      });

      setInstanceSettings({ ...instanceSettings, [instanceId]: values });
      setPinnedInstances(
        pinnedInstances.map((i) =>
          i.instanceId === instanceId ? { ...i, customLabel: label } : i,
        ),
      );
      setEditingInstance(null);
    } catch {
      setError("Failed to save applet settings");
    }
  };

  // ── Utility bar handlers ───────────────────────────────────────────────────

  const handleUtilityDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(utilityBarApplets);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setUtilityBarApplets(items);
  };

  const handleAddUtilityApplet = (appletId: string) => {
    const applet = availableUtilityApplets.find((a) => a.id === appletId);
    if (!applet) return;
    setUtilityBarApplets([
      ...utilityBarApplets,
      {
        appletId: applet.id,
        label: applet.label,
        description: applet.description,
        app: applet.app,
        appLabel: applet.appLabel,
        poppable: applet.poppable ?? false,
      },
    ]);
    setIsAddUtilityModalOpen(false);
  };

  const handleRemoveUtilityApplet = async (appletId: string) => {
    setUtilityBarApplets(utilityBarApplets.filter((a) => a.appletId !== appletId));

    // Clear saved position for this applet
    try {
      const settingManager = new SettingManager();
      const posSetting = await settingManager.readRecord({
        id: `${userId}:ui:utilityBarPositions`,
      });
      if (posSetting?.data.value) {
        const positions = JSON.parse(posSetting.data.value);
        delete positions[appletId];
        await settingManager.upsertRecord(`${userId}:ui:utilityBarPositions`, {
          value: JSON.stringify(positions),
          name: "ui:utilityBarPositions",
          user: userId,
        });
      }
    } catch {
      // Non-critical
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const settingManager = new SettingManager();
      const appletSettingManager = new AppletSettingManager();

      // Save pinned applets + app density
      await settingManager.upsertRecord(`${userId}:home:appDensity`, {
        value: appDensity,
        name: "home:appDensity",
        user: userId,
      });

      await settingManager.upsertRecord(`${userId}:home:applets`, {
        value: JSON.stringify(
          pinnedInstances.map((a) => ({
            instanceId: a.instanceId,
            appletId: a.appletId,
          })),
        ),
        name: "home:applets",
        user: userId,
      });

      for (const instance of pinnedInstances) {
        await appletSettingManager.upsertRecord(instance.instanceId, {
          user: userId,
          applet: instance.appletId,
          label: instance.customLabel,
          settings: instanceSettings[instance.instanceId] || {},
        });
      }

      // Save utility bar applets + density
      await settingManager.upsertRecord(`${userId}:ui:utilityBarDensity`, {
        value: utilityBarDensity,
        name: "ui:utilityBarDensity",
        user: userId,
      });

      await settingManager.upsertRecord(`${userId}:ui:utilityBar`, {
        value: JSON.stringify(utilityBarApplets.map((a) => a.appletId)),
        name: "ui:utilityBar",
        user: userId,
      });

      setSuccess("Settings saved successfully");
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Homescreen Settings</h2>
        </div>
        <div className={styles.emptyState}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Homescreen Settings</h2>
      </div>

      {error && <Banner variant="error">{error}</Banner>}
      {success && <Banner variant="success">{success}</Banner>}

      {/* ── App nav density ──────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
          <h3 className={styles.sectionTitle}>App Density</h3>
          <div style={{ display: "flex", flexDirection: "row" }}>
            {DENSITY_OPTIONS.map((option, i) => (
              <label
                key={option.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "7px 16px",
                  cursor: "pointer",
                  background: appDensity === option.value ? "#1e3a5f" : "transparent",
                  color: appDensity === option.value ? "#f1f5f9" : "#94a3b8",
                  borderTop: `1px solid ${appDensity === option.value ? "#3b82f6" : "#334155"}`,
                  borderBottom: `1px solid ${appDensity === option.value ? "#3b82f6" : "#334155"}`,
                  borderRight: `1px solid ${appDensity === option.value ? "#3b82f6" : "#334155"}`,
                  borderLeft: i === 0 ? `1px solid ${appDensity === option.value ? "#3b82f6" : "#334155"}` : "none",
                  borderRadius: i === 0 ? "6px 0 0 6px" : i === DENSITY_OPTIONS.length - 1 ? "0 6px 6px 0" : "0",
                  fontSize: "13px",
                  fontWeight: appDensity === option.value ? 600 : 400,
                  transition: "all 0.15s ease",
                  userSelect: "none",
                }}
              >
                <input
                  type="radio"
                  name="appDensity"
                  value={option.value}
                  checked={appDensity === option.value}
                  onChange={() => setAppDensity(option.value)}
                  style={{ display: "none" }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pinned applets ───────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Pinned Applets</h3>
          <ButtonIcon
            name="plus"
            label="Add applets"
            onClick={() => setIsAddModalOpen(true)}
            variant="bordered"
          />
        </div>

        {pinnedInstances.length === 0 ? (
          <div className={styles.emptyState}>
            No applets pinned. Click the + button to add applets to your
            homescreen.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="pinned-applets">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {pinnedInstances.map((instance, index) => (
                    <Draggable
                      key={instance.instanceId}
                      draggableId={instance.instanceId}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${styles.appletRow} ${
                            snapshot.isDragging ? styles.dragging : ""
                          }`}
                        >
                          <span className={styles.dragHandle}>
                            <Icon name="drag" size={16} />
                          </span>
                          <div className={styles.appletContent}>
                            <div className={styles.appletInfo}>
                              <span className={styles.appletTitle}>
                                {instance.customLabel}
                              </span>
                              <span className={styles.appletDescription}>
                                {instance.description}
                              </span>
                            </div>
                            <div className={styles.appletBadge}>
                              {instance.appLabel}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "4px", marginLeft: "12px" }}>
                            <ButtonIcon
                              name="edit"
                              label="Edit settings"
                              onClick={() => setEditingInstance(instance)}
                            />
                            <ButtonIcon
                              name="trash"
                              label="Remove applet"
                              onClick={() => handleRemove(instance.instanceId)}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>

      {/* ── Utility bar density ──────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
          <h3 className={styles.sectionTitle}>Utility Bar Density</h3>
          <div style={{ display: "flex", flexDirection: "row" }}>
            {DENSITY_OPTIONS.map((option, i) => (
              <label
                key={option.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "7px 16px",
                  cursor: "pointer",
                  background: utilityBarDensity === option.value ? "#1e3a5f" : "transparent",
                  color: utilityBarDensity === option.value ? "#f1f5f9" : "#94a3b8",
                  borderTop: `1px solid ${utilityBarDensity === option.value ? "#3b82f6" : "#334155"}`,
                  borderBottom: `1px solid ${utilityBarDensity === option.value ? "#3b82f6" : "#334155"}`,
                  borderRight: `1px solid ${utilityBarDensity === option.value ? "#3b82f6" : "#334155"}`,
                  borderLeft: i === 0 ? `1px solid ${utilityBarDensity === option.value ? "#3b82f6" : "#334155"}` : "none",
                  borderRadius: i === 0 ? "6px 0 0 6px" : i === DENSITY_OPTIONS.length - 1 ? "0 6px 6px 0" : "0",
                  fontSize: "13px",
                  fontWeight: utilityBarDensity === option.value ? 600 : 400,
                  transition: "all 0.15s ease",
                  userSelect: "none",
                }}
              >
                <input
                  type="radio"
                  name="utilityBarDensity"
                  value={option.value}
                  checked={utilityBarDensity === option.value}
                  onChange={() => setUtilityBarDensity(option.value)}
                  style={{ display: "none" }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── Utility bar applets ──────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Utility Bar Applets</h3>
          <ButtonIcon
            name="plus"
            label="Add utility applet"
            onClick={() => setIsAddUtilityModalOpen(true)}
            variant="bordered"
          />
        </div>

        {utilityBarApplets.length === 0 ? (
          <div className={styles.emptyState}>
            No utility bar applets added. Click the + button to add one.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleUtilityDragEnd}>
            <Droppable droppableId="utility-bar-applets">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {utilityBarApplets.map((instance, index) => (
                    <Draggable
                      key={instance.appletId}
                      draggableId={instance.appletId}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${styles.appletRow} ${
                            snapshot.isDragging ? styles.dragging : ""
                          }`}
                        >
                          <span className={styles.dragHandle}>
                            <Icon name="drag" size={16} />
                          </span>
                          <div className={styles.appletContent}>
                            <div className={styles.appletInfo}>
                              <span className={styles.appletTitle}>
                                {instance.label}
                              </span>
                              <span className={styles.appletDescription}>
                                {instance.description}
                                {instance.poppable && (
                                  <span style={{ color: "#3b82f6", marginLeft: "6px" }}>
                                    · Poppable
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className={styles.appletBadge}>
                              {instance.appLabel}
                            </div>
                          </div>
                          <div style={{ marginLeft: "12px" }}>
                            <ButtonIcon
                              name="trash"
                              label="Remove utility applet"
                              onClick={() => handleRemoveUtilityApplet(instance.appletId)}
                            />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>

      <StickyFooter bleed={20}>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </StickyFooter>

      {isAddModalOpen && (
        <AddAppletModal
          availableApplets={availableApplets}
          onAdd={handleAddApplet}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {editingInstance && (
        <SettingsModal
          instance={editingInstance}
          currentValues={instanceSettings[editingInstance.instanceId] || {}}
          currentLabel={editingInstance.customLabel}
          onSave={handleSaveSettings}
          onClose={() => setEditingInstance(null)}
        />
      )}

      {isAddUtilityModalOpen && (
        <AddUtilityAppletModal
          availableApplets={availableUtilityApplets}
          currentAppletIds={utilityBarApplets.map((a) => a.appletId)}
          onAdd={handleAddUtilityApplet}
          onClose={() => setIsAddUtilityModalOpen(false)}
        />
      )}
    </div>
  );
}
