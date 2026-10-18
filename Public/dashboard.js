
async function loadDashboard() {
  const message = document.getElementById("message");
  const totalBugs = document.getElementById("totalBugs");
  const bugsTable = document.getElementById("bugsTable");
  const statusFilter = document.getElementById("statusFilter");
  const severityFilter = document.getElementById("severityFilter");

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

      const filteredBugs = bugsData.bugs.filter(bug =>
        (selectedStatus === "All" || bug.status === selectedStatus) &&
        (selectedSeverity === "All" || bug.severity === selectedSeverity)
      );

      if (filteredBugs.length === 0) {
        message.textContent = "No bugs found for these filters.";
        return;
      }

      message.textContent = "";

      filteredBugs.forEach(bug => {
        const row = document.createElement("tr");

        [bug.title, bug.module_name || "Unassigned", bug.severity, bug.status]
          .forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "—";
            row.appendChild(cell);
          });

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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: statusSelect.value })
              }
            );

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.message || "Status update failed.");
            }

            await loadDashboard();
            document.getElementById("message").textContent =
              "Bug status updated successfully.";
          } catch (error) {
            message.textContent = error.message;
            updateButton.disabled = false;
          }
        });

        actionCell.append(statusSelect, updateButton);
        row.appendChild(actionCell);
        bugsTable.appendChild(row);
      });
    }

    statusFilter.addEventListener("change", renderBugs);
    severityFilter.addEventListener("change", renderBugs);

    renderBugs();
  } catch (error) {
    console.error("Dashboard loading error:", error);
    message.textContent = "Unable to load dashboard data.";
  }
}

loadDashboard();
