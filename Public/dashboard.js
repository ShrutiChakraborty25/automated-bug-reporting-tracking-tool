
async function loadDashboard() {
  const message = document.getElementById("message");
  const totalBugs = document.getElementById("totalBugs");
  const bugsTable = document.getElementById("bugsTable");
  const statusFilter = document.getElementById("statusFilter");
  const severityFilter = document.getElementById("severityFilter");
  const sortBy = document.getElementById("sortBy");
  const searchInput = document.getElementById("searchInput");
  const prevPage = document.getElementById("prevPage");
  const nextPage = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");

  let currentPage = 1;
  const pageSize = 5;

  try {
    const [bugsResponse, statsResponse] = await Promise.all([
      fetch("/api/bugs"),
      fetch("/api/bugs/stats")
    ]);

    if (!bugsResponse.ok || !statsResponse.ok) {
      throw new Error("Unable to load dashboard data.");
    }

    const bugsData = await bugsResponse.json();
    const statsData = await statsResponse.json();

    if (
      !bugsData ||
      bugsData.success !== true ||
      !Array.isArray(bugsData.bugs) ||
      !statsData ||
      statsData.success !== true ||
      !Array.isArray(statsData.byStatus) ||
      !Array.isArray(statsData.bySeverity)
    ) {
      throw new Error(
        "Invalid dashboard data. Check your API response."
      );
    }

    // Update summary cards.
    totalBugs.textContent = statsData.totalBugs;

    const statusCounts = Object.fromEntries(
      statsData.byStatus.map(item => [item.status, item.count])
    );

    document.getElementById("openBugs").textContent =
      statusCounts["Open"] || 0;

    document.getElementById("inProgressBugs").textContent =
      statusCounts["In Progress"] || 0;

    document.getElementById("resolvedBugs").textContent =
      statusCounts["Resolved"] || 0;

      const severityCounts = {
  Critical: 0,
  Major: 0,
  Minor: 0
};

statsData.bySeverity.forEach(item => {
  if (Object.hasOwn(severityCounts, item.severity)) {
    severityCounts[item.severity] = item.count;
  }
});

const totalSeverityBugs = Object.values(severityCounts)
  .reduce((sum, count) => sum + count, 0);

document.getElementById("criticalPercentage").textContent =
  `${totalSeverityBugs ? Math.round(severityCounts.Critical / totalSeverityBugs * 100) : 0}%`;

document.getElementById("majorPercentage").textContent =
  `${totalSeverityBugs ? Math.round(severityCounts.Major / totalSeverityBugs * 100) : 0}%`;

document.getElementById("minorPercentage").textContent =
  `${totalSeverityBugs ? Math.round(severityCounts.Minor / totalSeverityBugs * 100) : 0}%`;

  const severityPercentageTotal =
  Math.round(
    severityCounts.Critical / totalSeverityBugs * 100
  ) +
  Math.round(
    severityCounts.Major / totalSeverityBugs * 100
  ) +
  Math.round(
    severityCounts.Minor / totalSeverityBugs * 100
  );

console.log(
  "Severity percentage total:",
  totalSeverityBugs ? severityPercentageTotal + "%" : "No bugs available"
);

    function renderBugs() {
      bugsTable.replaceChildren();

      const selectedStatus = statusFilter.value;
      const selectedSeverity = severityFilter.value;
      const searchTerm = searchInput.value.trim().toLowerCase();

      // Filter bugs by status, severity and search text.
      const filteredBugs = bugsData.bugs.filter(bug => {
        const matchesStatus =
          selectedStatus === "All" ||
          bug.status === selectedStatus;

        const matchesSeverity =
          selectedSeverity === "All" ||
          bug.severity === selectedSeverity;

        const searchableText = [
          bug.id,
          bug.title || "",
          bug.created_at || "",
          bug.module_name || "",
          bug.severity || "",
          bug.status || "",
          bug.error_message || ""
        ].join(" ").toLowerCase();

        const matchesSearch =
          searchableText.includes(searchTerm);

        return matchesStatus && matchesSeverity && matchesSearch;
      });

      // Sort filtered bugs.
      const severityRank = {
        Critical: 3,
        Major: 2,
        Minor: 1
      };

      const sortedBugs = [...filteredBugs];

      if (sortBy.value === "title") {
        sortedBugs.sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );
      } else if (sortBy.value === "severity") {
        sortedBugs.sort((a, b) =>
          (severityRank[b.severity] || 0) -
          (severityRank[a.severity] || 0)
        );
      } else if (sortBy.value === "status") {
        sortedBugs.sort((a, b) =>
          (a.status || "").localeCompare(b.status || "")
        );
      }

      // Pagination.
      const totalPages = Math.max(
        1,
        Math.ceil(sortedBugs.length / pageSize)
      );

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      if (sortedBugs.length === 0) {
        message.textContent = bugsData.bugs.length > 0
          ? "No bugs match your current search or filters."
          : "No bug reports available yet. Run your Playwright tests to generate reports.";

        pageInfo.textContent = "Page 1 of 1";
        prevPage.disabled = true;
        nextPage.disabled = true;
        return;
      }

      message.textContent = "";

      const startIndex = (currentPage - 1) * pageSize;
      const pageBugs = sortedBugs.slice(
        startIndex,
        startIndex + pageSize
      );

      pageBugs.forEach(bug => {
        const row = document.createElement("tr");

        // Bug ID, title, creation date, module, severity and status.
        const createdAt = bug.created_at
          ? new Date(bug.created_at).toLocaleString()
          : "Unknown";

        [
  bug.id,
  bug.title || "Untitled",
  createdAt,
  bug.module_name || "Unassigned",
  bug.severity || "Unknown",
  bug.status || "Open"
].forEach((value, index) => {
  const cell = document.createElement("td");
  cell.textContent = value ?? "—";

  if (index === 4) {
  cell.classList.add(
    "severity-badge",
    `severity-${String(value).toLowerCase()}`
  );
}

if (index === 5) {
  cell.classList.add(
    "status-badge",
    `status-${String(value)
      .toLowerCase()
      .replace(/\s+/g, "-")}`
  );
}

  row.appendChild(cell);
});

        // Status update controls.
        const actionCell = document.createElement("td");
        const statusSelect = document.createElement("select");

        ["Open", "In Progress", "Resolved"].forEach(status => {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = status;
          statusSelect.appendChild(option);
        });

        statusSelect.value = bug.status;

        const updateButton = document.createElement("button");
        updateButton.type = "button";
        updateButton.textContent = "Update";

        updateButton.addEventListener("click", async () => {
          updateButton.disabled = true;
          message.textContent = "Updating bug status...";

          try {
            const response = await fetch(
              `/api/bugs/${bug.id}/status`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  status: statusSelect.value
                })
              }
            );

            const result = await response.json();

            if (!response.ok) {
              throw new Error(
                result.message || "Status update failed."
              );
            }

            await loadDashboard();
            await loadSeverityChart();
            await loadStatusChart();

            message.textContent =
              "Bug status updated successfully.";
          } catch (error) {
            console.error("Status update error:", error);
            message.textContent = error.message;
            updateButton.disabled = false;
          }
        });

        actionCell.append(statusSelect, updateButton);
        row.appendChild(actionCell);

        // View details modal.
        const detailsCell = document.createElement("td");
        const detailsButton = document.createElement("button");

        detailsButton.type = "button";
        detailsButton.textContent = "View Details";

        detailsButton.addEventListener("click", async () => {
          const modal = document.getElementById("bugModal");
          const closeButton = document.getElementById("closeModal");
          const screenshot =
            document.getElementById("modalBugScreenshot");
          const screenshotMessage =
            document.getElementById("modalScreenshotMessage");

          document.getElementById("modalBugTitle").textContent =
            bug.title || "Untitled";

          document.getElementById("modalBugModule").textContent =
            bug.module_name || "Unassigned";

          document.getElementById("modalBugSeverity").textContent =
            bug.severity || "Unknown";

          document.getElementById("modalBugStatus").textContent =
            bug.status || "Open";

          document.getElementById("modalBugError").textContent =
            bug.error_message || "No error message available";

          screenshot.hidden = true;
          screenshot.removeAttribute("src");
          screenshotMessage.textContent = "Loading screenshot...";

          modal.hidden = false;
          closeButton.focus();

          const closeModal = () => {
            modal.hidden = true;
            screenshot.removeAttribute("src");
            document.removeEventListener("keydown", handleEscape);
            detailsButton.focus();
          };

          const handleEscape = event => {
            if (event.key === "Escape" && !modal.hidden) {
              closeModal();
            }
          };

          closeButton.onclick = closeModal;

          modal.onclick = event => {
            if (event.target === modal) {
              closeModal();
            }
          };

          document.addEventListener("keydown", handleEscape);

          try {
            const response = await fetch(
              `/api/bugs/${bug.id}/screenshot`
            );

            if (!response.ok) {
              throw new Error("Screenshot unavailable.");
            }

            const screenshotUrl = URL.createObjectURL(
              await response.blob()
            );

            screenshot.onload = () => {
              screenshot.hidden = false;
              screenshotMessage.textContent = "";
              URL.revokeObjectURL(screenshotUrl);
            };

            screenshot.onerror = () => {
              screenshot.hidden = true;
              screenshotMessage.textContent =
                "Unable to display screenshot.";
              URL.revokeObjectURL(screenshotUrl);
            };

            screenshot.src = screenshotUrl;
          } catch (error) {
            screenshotMessage.textContent = error.message;
          }
        });

        detailsCell.appendChild(detailsButton);
        row.appendChild(detailsCell);

        bugsTable.appendChild(row);
      });

      // Update pagination controls.
      pageInfo.textContent =
        `Page ${currentPage} of ${totalPages}`;

      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages;
    }

    // Filters, sorting and search.
    statusFilter.onchange = () => {
      currentPage = 1;
      renderBugs();
    };

    severityFilter.onchange = () => {
      currentPage = 1;
      renderBugs();
    };

    sortBy.onchange = () => {
      currentPage = 1;
      renderBugs();
    };

    searchInput.oninput = () => {
      currentPage = 1;
      renderBugs();
    };

    // Clear all filters.
    const clearFiltersButton =
      document.getElementById("clearFilters");

    if (clearFiltersButton) {
      clearFiltersButton.onclick = () => {
        statusFilter.value = "All";
        severityFilter.value = "All";
        sortBy.value = "default";
        searchInput.value = "";
        currentPage = 1;
        renderBugs();
      };
    }

    // Previous page.
    prevPage.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderBugs();
      }
    };

    // Next page.
    nextPage.onclick = () => {
      currentPage++;
      renderBugs();
    };

    renderBugs();

  } catch (error) {
    console.error("Dashboard loading error:", error);

    message.textContent =
      "Unable to load dashboard data. Please check the server and API.";

    totalBugs.textContent = "—";
    document.getElementById("openBugs").textContent = "—";
    document.getElementById("inProgressBugs").textContent = "—";
    document.getElementById("resolvedBugs").textContent = "—";

    bugsTable.replaceChildren();
    pageInfo.textContent = "Page 1 of 1";
    prevPage.disabled = true;
    nextPage.disabled = true;
  }
}


// Severity doughnut chart.
let severityChart = null;

async function loadSeverityChart() {
  const canvas = document.getElementById("severityChart");

  if (!canvas || typeof Chart === "undefined") {
    console.error("Severity chart canvas or Chart.js is unavailable.");
    return;
  }

  try {
    const response = await fetch("/api/bugs/stats");

    if (!response.ok) {
      throw new Error("Unable to load bug statistics.");
    }

    const statsData = await response.json();

    if (
      !statsData.success ||
      !Array.isArray(statsData.bySeverity)
    ) {
      throw new Error("Invalid severity statistics.");
    }

    const severityCounts = {
      Critical: 0,
      Major: 0,
      Minor: 0
    };

    statsData.bySeverity.forEach(item => {
      if (Object.hasOwn(severityCounts, item.severity)) {
        severityCounts[item.severity] = item.count;
      }
    });

    if (severityChart) {
      severityChart.destroy();
    }

    severityChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["Critical", "Major", "Minor"],
        datasets: [{
          label: "Number of Bugs",
          data: [
            severityCounts.Critical,
            severityCounts.Major,
            severityCounts.Minor
          ],
          backgroundColor: ["#dc2626", "#f59e0b", "#16a34a"],
          borderColor: "#ffffff",
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          },
          title: {
            display: true,
            text: "Bugs by Severity"
          }
        }
      }
    });
  } catch (error) {
    console.error("Severity chart error:", error);
    document.getElementById("message").textContent =
      "Unable to load the severity chart. Please refresh the page.";
  }
}


// Status bar chart.
let statusChart = null;

async function loadStatusChart() {
  const canvas = document.getElementById("statusChart");

  if (!canvas || typeof Chart === "undefined") {
    console.error("Status chart canvas or Chart.js is unavailable.");
    return;
  }

  try {
    const response = await fetch("/api/bugs/stats");

    if (!response.ok) {
      throw new Error("Unable to load bug statistics.");
    }

    const statsData = await response.json();

    if (
      !statsData.success ||
      !Array.isArray(statsData.byStatus)
    ) {
      throw new Error("Invalid status statistics.");
    }

    const statusCounts = {
      Open: 0,
      "In Progress": 0,
      Resolved: 0
    };

    statsData.byStatus.forEach(item => {
      if (Object.hasOwn(statusCounts, item.status)) {
        statusCounts[item.status] = item.count;
      }
    });

    if (statusChart) {
      statusChart.destroy();
    }

    statusChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Open", "In Progress", "Resolved"],
        datasets: [{
          label: "Number of Bugs",
          data: [
            statusCounts.Open,
            statusCounts["In Progress"],
            statusCounts.Resolved
          ],
          backgroundColor: ["#dc2626", "#f59e0b", "#16a34a"],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: "Bugs by Status"
          }
        }
      }
    });
  } catch (error) {
    console.error("Status chart error:", error);
    document.getElementById("message").textContent =
      "Unable to load the status chart. Please refresh the page.";
  }
}


// Initial dashboard load.
loadDashboard();
loadSeverityChart();
loadStatusChart();


// Manual dashboard refresh.
const refreshButton = document.getElementById("refreshDashboard");

if (refreshButton) {
  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";

    try {
      await loadDashboard();
      await loadSeverityChart();
      await loadStatusChart();
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh Dashboard";
    }
  });
}
