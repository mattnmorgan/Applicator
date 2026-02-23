"use client";

import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import SettingManager from "@/lib/client/managers/setting";
import AppletSettingManager from "@/lib/client/managers/appletSetting";
import DynamicInput from "@/lib/components/utility/DynamicInput/DynamicInput";
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
  options?: { value: string; label: string; description?: string; icon?: string }[];
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
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
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
                <button
                  className={styles.addAppletButton}
                  onClick={() =>
                    onAdd(applet.id, labels[applet.id] || applet.label)
                  }
                >
                  Add
                </button>
              </div>
            ))
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Close
          </button>
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
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
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
              <DynamicInput
                key={def.name}
                input={inputDef}
                value={values[def.name]}
                onChange={(id, value) =>
                  setValues((prev) => ({ ...prev, [id]: value }))
                }
              />
            );
          })}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeSettingsPage() {
  const [pinnedInstances, setPinnedInstances] = useState<PinnedInstance[]>([]);
  const [instanceSettings, setInstanceSettings] = useState<
    Record<string, Record<string, any>>
  >({});
  const [availableApplets, setAvailableApplets] = useState<AppletInfo[]>([]);
  const [userId, setUserId] = useState<string>("");
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

      // Fetch user's current pinned applets setting
      const settingManager = new SettingManager();
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
      const instance = pinnedInstances.find(
        (i) => i.instanceId === instanceId,
      );
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

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Pinned Applets</h3>
          <button
            className={styles.addButton}
            onClick={() => setIsAddModalOpen(true)}
            title="Add applets"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
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
                          <button
                            className={styles.editButton}
                            onClick={() => setEditingInstance(instance)}
                            title="Edit settings"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M11.5 2.5L13.5 4.5M10 4L3 11V13H5L12 6L10 4Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            className={styles.removeButton}
                            onClick={() => handleRemove(instance.instanceId)}
                            title="Remove applet"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M2 4H14M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M13 4V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
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

      <div className={styles.actions}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

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
