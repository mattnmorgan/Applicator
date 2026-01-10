"use client";

import { useState, useEffect } from "react";
import TableDefinition from "@/lib/database/types/tableDefinition";
import Badge from "@/lib/components/Badge/Badge";

interface TableSearchResult {
  appId: string;
  appName: string;
  table: TableDefinition;
}

export default function DataModelsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tables, setTables] = useState<TableSearchResult[]>([]);
  const [filteredTables, setFilteredTables] = useState<TableSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableSearchResult | null>(
    null
  );

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTables(tables);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tables
        .filter(
          (t) =>
            t.table.name.toLowerCase().includes(query) ||
            t.table.description.toLowerCase().includes(query) ||
            t.appName.toLowerCase().includes(query)
        )
        .sort((a, b) => a.table.name.localeCompare(b.table.name));
      setFilteredTables(filtered);
    }
  }, [searchQuery, tables]);

  const fetchTables = async () => {
    try {
      const response = await fetch("/api/system/apps/tables/search");
      const data = await response.json();

      if (data.success) {
        // Sort tables alphabetically by table name
        const sortedResults = data.results.sort((a: TableSearchResult, b: TableSearchResult) =>
          a.table.name.localeCompare(b.table.name)
        );
        setTables(sortedResults);
        setFilteredTables(sortedResults);
      }
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldTypeVariant = (type: string) => {
    const variantMap: Record<
      string,
      | "purple"
      | "blue"
      | "yellow"
      | "green"
      | "red"
      | "gray"
      | "cyan"
      | "pink"
      | "orange"
      | "emerald"
      | "amber"
    > = {
      string: "blue",
      number: "emerald",
      boolean: "purple",
      date: "orange",
      datetime: "orange",
      json: "pink",
      relationship: "cyan",
      formula: "amber",
    };
    return variantMap[type] || "gray";
  };

  return (
    <div>
      <h1
        style={{
          fontSize: "32px",
          fontWeight: "bold",
          marginBottom: "20px",
          color: "#f1f5f9",
        }}
      >
        Data Models
      </h1>

      <p
        style={{
          fontSize: "14px",
          color: "#94a3b8",
          marginBottom: "24px",
        }}
      >
        Browse and search data models across all installed applications
      </p>

      <div style={{ marginBottom: "24px" }}>
        <input
          type="text"
          placeholder="Search tables by name, description, or app..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "600px",
            padding: "12px 16px",
            background: "#0f172a",
            border: "1px solid #475569",
            borderRadius: "6px",
            color: "#f1f5f9",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#475569")}
        />
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: "14px" }}>
          Loading tables...
        </div>
      ) : (
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ flex: 1, maxWidth: "400px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {filteredTables.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#94a3b8",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  No tables found
                </div>
              ) : (
                filteredTables.map((result, index) => (
                  <div
                    key={`${result.appId}:${result.table.name}`}
                    onClick={() => setSelectedTable(result)}
                    style={{
                      padding: "16px",
                      background: "#1e293b",
                      border: `2px solid ${
                        selectedTable?.appId === result.appId &&
                        selectedTable?.table.name === result.table.name
                          ? "#3b82f6"
                          : "#334155"
                      }`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      if (
                        selectedTable?.appId !== result.appId ||
                        selectedTable?.table.name !== result.table.name
                      ) {
                        e.currentTarget.style.borderColor = "#475569";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (
                        selectedTable?.appId !== result.appId ||
                        selectedTable?.table.name !== result.table.name
                      ) {
                        e.currentTarget.style.borderColor = "#334155";
                      }
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#f1f5f9",
                          margin: 0,
                        }}
                      >
                        {result.table.name}
                      </h3>
                      <Badge variant="gray">{result.appName}</Badge>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#94a3b8",
                        margin: "0 0 8px 0",
                      }}
                    >
                      {result.table.description}
                    </p>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {result.table.fields.length} field
                      {result.table.fields.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedTable && (
            <div style={{ flex: 1 }}>
              <div
                style={{
                  padding: "24px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
              >
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#f1f5f9",
                        margin: 0,
                      }}
                    >
                      {selectedTable.table.name}
                    </h2>
                    <Badge variant="gray">{selectedTable.appName}</Badge>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#94a3b8",
                      margin: 0,
                    }}
                  >
                    {selectedTable.table.description}
                  </p>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#f1f5f9",
                      marginBottom: "16px",
                    }}
                  >
                    Fields
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {selectedTable.table.fields
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((field, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "12px",
                          background: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "#f1f5f9",
                            }}
                          >
                            {field.name}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <Badge
                              shape="square"
                              variant={getFieldTypeVariant(field.type)}
                              uppercase
                            >
                              {field.type}
                            </Badge>
                            {field.required && (
                              <Badge shape="square" variant="red" uppercase>
                                REQUIRED
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#94a3b8",
                            margin: "0 0 8px 0",
                          }}
                        >
                          {field.description}
                        </p>
                        {field.relatedTo && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            Related to:{" "}
                            <span
                              style={{
                                color: "#06b6d4",
                                fontFamily: "monospace",
                              }}
                            >
                              {field.relatedTo}
                            </span>
                          </div>
                        )}
                        {field.defaultValue !== undefined && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            Default:{" "}
                            <span
                              style={{
                                color: "#94a3b8",
                                fontFamily: "monospace",
                              }}
                            >
                              {JSON.stringify(field.defaultValue)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
