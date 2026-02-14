"use client";

import { useState, useEffect } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import SettingManager from "@/lib/client/managers/setting";
import styles from "./page.module.css";

interface AppletInfo {
  id: string;
  label: string;
  description: string;
  app: string;
  target: string;
}

interface AddAppletModalProps {
  availableApplets: AppletInfo[];
  selectedApplets: Set<string>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

function AddAppletModal({
  availableApplets,
  selectedApplets,
  onSelect,
  onAdd,
  onClose,
}: AddAppletModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Add Applets</h3>
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
              No more applets available to add.
            </div>
          ) : (
            availableApplets.map((applet) => (
              <label key={applet.id} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={selectedApplets.has(applet.id)}
                  onChange={() => onSelect(applet.id)}
                />
                <div className={styles.checkboxContent}>
                  <span className={styles.checkboxLabel}>{applet.label}</span>
                  <span className={styles.checkboxDescription}>
                    {applet.description}
                  </span>
                </div>
              </label>
            ))
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={onAdd}
            disabled={selectedApplets.size === 0}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomeSettingsPage() {
  const [pinnedApplets, setPinnedApplets] = useState<AppletInfo[]>([]);
  const [availableApplets, setAvailableApplets] = useState<AppletInfo[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApplets, setSelectedApplets] = useState<Set<string>>(
    new Set(),
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

      // Fetch user's current pinned applets setting
      const settingManager = new SettingManager();
      const setting = await settingManager.readRecord({
        id: `${currentUserId}:home:applets`,
      });

      if (setting && setting.data.value) {
        try {
          const appletIds = JSON.parse(setting.data.value);
          // Map saved IDs to full applet info, filtering out invalid ones
          const pinned = appletIds
            .map((id: string) =>
              homeApplets.find((a: AppletInfo) => a.id === id),
            )
            .filter(Boolean);
          setPinnedApplets(pinned);

          // Silently clean up invalid applets from saved settings
          if (pinned.length !== appletIds.length) {
            const validIds = pinned.map((a: AppletInfo) => a.id);
            const settingMgr = new SettingManager();
            settingMgr.upsertRecord(`${currentUserId}:home:applets`, {
              value: JSON.stringify(validIds),
              name: "home:applets",
              user: currentUserId,
            });
          }
        } catch {
          setPinnedApplets([]);
        }
      } else {
        setPinnedApplets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pinnedApplets);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    setPinnedApplets(items);
  };

  const handleRemove = (id: string) => {
    setPinnedApplets(pinnedApplets.filter((a) => a.id !== id));
  };

  const handleAddSelected = () => {
    const newApplets = availableApplets.filter(
      (a) =>
        selectedApplets.has(a.id) && !pinnedApplets.find((p) => p.id === a.id),
    );
    setPinnedApplets([...pinnedApplets, ...newApplets]);
    setSelectedApplets(new Set());
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const settingManager = new SettingManager();
      await settingManager.upsertRecord(`${userId}:home:applets`, {
        value: JSON.stringify(pinnedApplets.map((a) => a.id)),
        name: "home:applets",
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

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Pinned Applets</h3>
          <button
            className={styles.addButton}
            onClick={() => setIsModalOpen(true)}
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

        {pinnedApplets.length === 0 ? (
          <div className={styles.emptyState}>
            No applets pinned. Click the + button to add applets to your
            homescreen.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="pinned-applets">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {pinnedApplets.map((applet, index) => (
                    <Draggable
                      key={applet.id}
                      draggableId={applet.id}
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
                                {applet.label}
                              </span>
                              <span className={styles.appletDescription}>
                                {applet.description}
                              </span>
                            </div>
                            <div className={styles.appletBadge}>
                              {applet.app}
                            </div>
                          </div>
                          <button
                            className={styles.removeButton}
                            onClick={() => handleRemove(applet.id)}
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

      {isModalOpen && (
        <AddAppletModal
          availableApplets={availableApplets.filter(
            (a) => !pinnedApplets.find((p) => p.id === a.id),
          )}
          selectedApplets={selectedApplets}
          onSelect={(id) => {
            const newSelected = new Set(selectedApplets);
            if (newSelected.has(id)) {
              newSelected.delete(id);
            } else {
              newSelected.add(id);
            }
            setSelectedApplets(newSelected);
          }}
          onAdd={handleAddSelected}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedApplets(new Set());
          }}
        />
      )}
    </div>
  );
}
