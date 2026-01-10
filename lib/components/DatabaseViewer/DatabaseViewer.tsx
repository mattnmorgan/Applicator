"use client";

import { useState, useEffect } from "react";
import styles from "./DatabaseViewer.module.css";

interface TreeNode {
  name: string;
  fullKey?: string;
  children?: TreeNode[];
}

interface TreeItemProps {
  node: TreeNode;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

function TreeItem({ node, selectedKey, onSelect }: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isLeaf = node.fullKey !== undefined;
  const isActive = node.fullKey === selectedKey;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (isLeaf && node.fullKey) {
      onSelect(node.fullKey);
    }
  };

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.treeNodeContent} ${
          isActive ? styles.treeNodeContentActive : ""
        }`}
        onClick={handleClick}
      >
        {hasChildren ? (
          <span
            className={`${styles.expandIcon} ${
              isExpanded
                ? styles.expandIconExpanded
                : styles.expandIconCollapsed
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 3L9 7L5 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : (
          <span style={{ width: "14px" }} />
        )}
        <span>{node.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {node.children!.map((child, index) => (
            <TreeItem
              key={index}
              node={child}
              selectedKey={selectedKey}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(keys: string[]): TreeNode[] {
  const root: { [key: string]: any } = {};

  keys.forEach((key) => {
    const parts = key.split(":");
    let current = root;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? { __leaf: key } : {};
      }
      current = current[part];
    });
  });

  function convertToTree(obj: any, prefix: string = ""): TreeNode[] {
    return Object.keys(obj)
      .sort()
      .filter((key) => key !== "__leaf")
      .map((key) => {
        const value = obj[key];
        const fullPrefix = prefix ? `${prefix}:${key}` : key;

        if (value.__leaf) {
          const nonLeafKeys = Object.keys(value).filter((k) => k !== "__leaf");
          return {
            name: key,
            fullKey: value.__leaf,
            children: nonLeafKeys.length
              ? convertToTree(value, fullPrefix)
              : [],
          };
        } else {
          return {
            name: key,
            children: convertToTree(value, fullPrefix),
          };
        }
      });
  }

  return convertToTree(root);
}

export default function DatabaseViewer() {
  const [keys, setKeys] = useState<string[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");
  const [editedValue, setEditedValue] = useState<string>("");
  const [isValidJson, setIsValidJson] = useState(true);
  const [isJsonValue, setIsJsonValue] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showFlushModal, setShowFlushModal] = useState(false);

  const fetchKeys = async () => {
    try {
      const response = await fetch("/api/system/debug/redis/keys");
      const data = await response.json();
      setKeys(data.keys || []);
      setTreeData(buildTree(data.keys || []));
    } catch (error) {
      console.error("Failed to fetch keys:", error);
    }
  };

  const fetchValue = async (key: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/system/debug/redis/value?key=${encodeURIComponent(key)}`
      );
      const data = await response.json();

      let formattedValue = "";
      let isJson = false;

      if (data.value !== null && data.value !== undefined) {
        try {
          // Try to parse as JSON for pretty formatting
          const parsed = JSON.parse(data.value);
          formattedValue = JSON.stringify(parsed, null, 2);
          isJson = true;
        } catch {
          // If not valid JSON, just use the raw value
          formattedValue = data.value;
          isJson = false;
        }
      }

      setValue(formattedValue);
      setEditedValue(formattedValue);
      setIsJsonValue(isJson);
      setIsValidJson(true); // Initially valid since we just loaded it
    } catch (error) {
      console.error("Failed to fetch value:", error);
      setValue("");
      setEditedValue("");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedKey) return;

    try {
      let valueToSave = editedValue;

      // If the original value was JSON, validate and save as minified JSON
      if (isJsonValue) {
        if (!isValidJson) {
          alert("Invalid JSON - cannot save");
          return;
        }
        const parsed = JSON.parse(editedValue);
        valueToSave = JSON.stringify(parsed);
      }
      // Otherwise, save as plain string

      const response = await fetch("/api/system/debug/redis/value", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          value: valueToSave,
        }),
      });

      if (response.ok) {
        setValue(editedValue);
        alert("Saved successfully");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;

    try {
      const response = await fetch(
        `/api/system/debug/redis/value?key=${encodeURIComponent(selectedKey)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSelectedKey(null);
        setValue("");
        setEditedValue("");
        fetchKeys();
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete");
    }
  };

  const handleValueChange = (newValue: string) => {
    setEditedValue(newValue);

    // Only validate JSON if the original value was JSON
    if (isJsonValue) {
      try {
        JSON.parse(newValue);
        setIsValidJson(true);
      } catch {
        setIsValidJson(false);
      }
    } else {
      // Non-JSON values are always valid
      setIsValidJson(true);
    }
  };

  const handleSelectKey = (key: string) => {
    setSelectedKey(key);
    fetchValue(key);
  };

  const handleFlushDatabase = async () => {
    try {
      const response = await fetch("/api/system/debug/redis/flush", {
        method: "POST",
      });

      if (response.ok) {
        setShowFlushModal(false);
        setSelectedKey(null);
        setValue("");
        setEditedValue("");
        fetchKeys();
        alert("Database flushed successfully");
      } else {
        alert("Failed to flush database");
      }
    } catch (error) {
      console.error("Failed to flush database:", error);
      alert("Failed to flush database");
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const hasChanges = value !== editedValue;

  return (
    <>
      {showFlushModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Flush Database</h3>
            <p className={styles.modalMessage}>
              Are you sure you want to flush the entire Redis database? This
              action cannot be undone and will delete all keys.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowFlushModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmButton}
                onClick={handleFlushDatabase}
              >
                Flush Database
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.header}>
            <span className={styles.title}>Keys</span>
            <div className={styles.headerButtons}>
              <button
                className={styles.flushButton}
                onClick={() => setShowFlushModal(true)}
                title="Flush Database"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 4H14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6 2H10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M3 4V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.5 7V11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.5 7V11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                className={styles.refreshButton}
                onClick={fetchKeys}
                title="Refresh"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C9.84838 2 11.5 2.84506 12.5974 4.18869"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 4H14V0"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className={styles.treeContainer}>
            {treeData.map((node, index) => (
              <TreeItem
                key={index}
                node={node}
                selectedKey={selectedKey}
                onSelect={handleSelectKey}
              />
            ))}
          </div>
        </div>
        <div className={styles.content}>
          {selectedKey ? (
            <>
              <div className={styles.editorHeader}>
                <span className={styles.keyName}>{selectedKey}</span>
                <div className={styles.actions}>
                  <button
                    className={`${styles.button} ${styles.saveButton}`}
                    onClick={handleSave}
                    disabled={!hasChanges || (isJsonValue && !isValidJson)}
                  >
                    Save
                  </button>
                  <button
                    className={`${styles.button} ${styles.deleteButton}`}
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {isJsonValue && !isValidJson && (
                <div className={styles.error}>Invalid JSON</div>
              )}
              <textarea
                className={styles.editor}
                value={editedValue}
                onChange={(e) => handleValueChange(e.target.value)}
                spellCheck={false}
              />
            </>
          ) : (
            <div className={styles.placeholder}>
              Select a key from the tree to view and edit its value
            </div>
          )}
        </div>
      </div>
    </>
  );
}
