
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
        (selectedStatus === "All" ||
          bug.status === selectedStatus) &&
        (selectedSeverity === "All" ||
          bug.severity === selectedSeverity)
      );

      if (filteredBugs.length === 0) {
        message.textContent = "No bugs found for these filters.";
        return;
      }

      message.textContent = "";

      filteredBugs.forEach(bug => {
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
