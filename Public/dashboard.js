
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

    if (!bugsData.success || !statsData.success) {
      throw new Error("API returned an unsuccessful response.");
    }

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

    function renderBugs() {
      bugsTable.replaceChildren();

      const selectedStatus = statusFilter.value;
      const selectedSeverity = severityFilter.value;
      const searchTerm = searchInput.value.trim().toLowerCase();

      // Filter bugs by status, severity, and search text.
      const filteredBugs = bugsData.bugs.filter(bug => {
        const matchesStatus =
          selectedStatus === "All" || bug.status === selectedStatus;

        const matchesSeverity =
          selectedSeverity === "All" ||
          bug.severity === selectedSeverity;

        const searchableText = [
          bug.title || "",
          bug.module_name || "",
          bug.error_message || ""
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        return matchesStatus && matchesSeverity && matchesSearch;
      });

      // Sort the filtered results.
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

      // Calculate pagination after filtering and sorting.
      const totalPages = Math.max(
        1,
        Math.ceil(sortedBugs.length / pageSize)
      );

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      if (sortedBugs.length === 0) {
        message.textContent = "No bugs found for these filters.";
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

        [
          bug.title,
          bug.module_name || "Unassigned",
          bug.severity,
          bug.status
        ].forEach(value => {
          const cell = document.createElement("td");
          cell.textContent = value ?? "—";
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

            // Refresh the dashboard and both charts.
            await loadDashboard();
            await loadSeverityChart();
            await loadStatusChart();

            document.getElementById("message").textContent =
              "Bug status updated successfully.";
          } catch (error) {
            message.textContent = error.message;
            updateButton.disabled = false;
          }
        });

        actionCell.append(statusSelect, updateButton);
        row.appendChild(actionCell);

        // View details modal and screenshot.
        const detailsCell = document.createElement("td");
        const detailsButton = document.createElement("button");

        detailsButton.textContent = "View Details";

        detailsButton.addEventListener("click", async () => {
          const modal = document.getElementById("bugModal");
          const closeButton = document.getElementById("closeModal");
          const screenshot =
            document.getElementById("modalBugScreenshot");
          const screenshotMessage =
            document.getElementById("modalScreenshotMessage");

          document.getElementById("modalBugTitle").textContent =
            bug.title;

          document.getElementById("modalBugModule").textContent =
            bug.module_name || "Unassigned";

          document.getElementById("modalBugSeverity").textContent =
            bug.severity;

          document.getElementById("modalBugStatus").textContent =
            bug.status;

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
            detailsButton.focus();
          };

          closeButton.onclick = closeModal;

          modal.onclick = event => {
            if (event.target === modal) {
              closeModal();
            }
          };

          const handleEscape = event => {
            if (event.key === "Escape" && !modal.hidden) {
              closeModal();
            }
          };

          document.addEventListener(
            "keydown",
            handleEscape,
            { once: true }
          );

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
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages;
    }

    // Filters, sorting, and search reset pagination.
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

    prevPage.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderBugs();
      }
    };

    nextPage.onclick = () => {
      currentPage++;
      renderBugs();
    };

    renderBugs();
  } catch (error) {
    console.error("Dashboard loading error:", error);
    message.textContent = "Unable to load dashboard data.";
  }
}


// Display bug details safely as plain text.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
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

    if (!statsData.success) {
      throw new Error("Bug statistics API returned an error.");
    }

    const severityCounts = {
      Critical: 0,
      Major: 0,
      Minor: 0
    };

    statsData.bySeverity.forEach(item => {
      severityCounts[item.severity] = item.count;
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

    if (!statsData.success) {
      throw new Error("Bug statistics API returned an error.");
    }

    const statusCounts = {
      Open: 0,
      "In Progress": 0,
      Resolved: 0
    };

    statsData.byStatus.forEach(item => {
      statusCounts[item.status] = item.count;
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
  }
}


// Load dashboard and charts.
loadDashboard();
loadSeverityChart();
loadStatusChart();
