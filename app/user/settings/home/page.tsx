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

interface AddAppletModalProps {
  availableApplets: AppletInfo[];
  onAdd: (appletId: string, customLabel: string) => void;
  onClose: () => void;
}

function AddAppletModal({
  availableApplets,
  onAdd,
  onClose,
}: AddAppletModalProps) {
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const applet of availableApplets) {
      initial[applet.id] = applet.label;
    }
    return initial;
  });

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Applet</h3>
          <ButtonIcon name="close" label="Close" onClick={onClose} iconSize={20} />
        </div>
        <div className={styles.modalBody}>
          {availableApplets.length === 0 ? (
            <div className={styles.emptyState}>
              No applets available to add.
            </div>
          ) : (
            availableApplets.map((applet) => (
              <div key={applet.id} className={styles.addAppletRow}>
                <div className={styles.checkboxContent}>
                  <span className={styles.checkboxLabel}>{applet.label}</span>
                  <span className={styles.checkboxDescription}>
                    {applet.description}
                  </span>
                  <input
                    className={styles.settingInput}
                    type="text"
                    placeholder="Custom label"
                    value={labels[applet.id] || ""}
                    onChange={(e) =>
                      setLabels({ ...labels, [applet.id]: e.target.value })
                    }
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: "6px" }}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() =>
                    onAdd(applet.id, labels[applet.id] || applet.label)
                  }
                >
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
  const [pinnedInstances, setPinnedInstances] = useState<PinnedInstance[]>([]);
  const [instanceSettings, setInstanceSettings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [availableApplets, setAvailableApplets] = useState<AppletInfo[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [appDensity, setAppDensity] = useState<"full" | "name" | "icon">("full");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<PinnedInstance | null>(
    null,
  );
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

      // Fetch user info and available applets
      const userRes = await fetch("/api/system/settings/user");
      if (!userRes.ok) {
        throw new Error("Failed to fetch user data");
      }
      const userData = await userRes.json();
      const currentUserId = userData.user.id;
      setUserId(currentUserId);

      // Filter home-target applets
      const homeApplets = (userData.userApplets || []).filter(
        (a: AppletInfo) => a.target === "home",
      );
      setAvailableApplets(homeApplets);

      // Build applet lookup
      const appletMap = new Map<string, AppletInfo>();
      for (const applet of homeApplets) {
        appletMap.set(applet.id, applet);
      }

      // Fetch home display settings
      const settingManager = new SettingManager();
      const densityRecord = await settingManager.readRecord({
        id: `${currentUserId}:home:appDensity`,
      });
      const validDensities = ["full", "name", "icon"];
      const loadedDensity = densityRecord?.data.value;
      if (loadedDensity && validDensities.includes(loadedDensity)) {
        setAppDensity(loadedDensity as "full" | "name" | "icon");
      }

      // Fetch user's current pinned applets setting
      const setting = await settingManager.readRecord({
        id: `${currentUserId}:home:applets`,
      });

      if (setting && setting.data.value) {
        try {
          const instances = JSON.parse(setting.data.value);
          if (Array.isArray(instances)) {
            // Map saved instances to full applet info
            const pinned: PinnedInstance[] = [];
            const settingsMap: Record<string, Record<string, any>> = {};

            const appletSettingManager = new AppletSettingManager();

            for (const inst of instances) {
              const applet = appletMap.get(inst.appletId);
              if (applet) {
                let instanceSettingsData: Record<string, any> = {};
                let customLabel = applet.label;

                // Fetch instance settings and custom label
                try {
                  const settingRecord = await appletSettingManager.readRecord({
                    id: inst.instanceId,
                  });
                  if (settingRecord) {
                    instanceSettingsData = settingRecord.data.settings || {};
                    if (settingRecord.data.label) {
                      customLabel = settingRecord.data.label;
                    }
                  }
                } catch {
                  // No settings for this instance yet
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
      } else {
        setPinnedInstances([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pinnedInstances);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setPinnedInstances(items);
  };

  const handleRemove = async (instanceId: string) => {
    setPinnedInstances(
      pinnedInstances.filter((a) => a.instanceId !== instanceId),
    );

    // Delete instance settings
    try {
      const appletSettingManager = new AppletSettingManager();
      await appletSettingManager.deleteRecord(instanceId);
    } catch {
      // Settings may not exist, that's okay
    }

    // Remove from settings map
    const newSettings = { ...instanceSettings };
    delete newSettings[instanceId];
    setInstanceSettings(newSettings);
  };

  const handleAddApplet = (appletId: string, customLabel: string) => {
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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const settingManager = new SettingManager();
      const appletSettingManager = new AppletSettingManager();

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

      // Persist labels and settings for each instance
      for (const instance of pinnedInstances) {
        await appletSettingManager.upsertRecord(instance.instanceId, {
          user: userId,
          applet: instance.appletId,
          label: instance.customLabel,
          settings: instanceSettings[instance.instanceId] || {},
        });
      }

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

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>App Density</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {DENSITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                background: appDensity === option.value ? "#1e3a5f" : "transparent",
                border: `1px solid ${appDensity === option.value ? "#3b82f6" : "#334155"}`,
                transition: "all 0.15s ease",
              }}
            >
              <input
                type="radio"
                name="appDensity"
                value={option.value}
                checked={appDensity === option.value}
                onChange={() => setAppDensity(option.value)}
                style={{ accentColor: "#3b82f6", flexShrink: 0 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "#f1f5f9" }}>
                  {option.label}
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </section>

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
    </div>
  );
}
