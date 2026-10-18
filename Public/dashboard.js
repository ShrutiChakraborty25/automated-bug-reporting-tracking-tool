
async function loadDashboard() {
  const message = document.getElementById("message");
  const totalBugs = document.getElementById("totalBugs");
  const bugsTable = document.getElementById("bugsTable");
  const statusFilter = document.getElementById("statusFilter");
  const severityFilter = document.getElementById("severityFilter");
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

const filteredBugs = bugsData.bugs.filter(bug => {
  const matchesStatus =
    selectedStatus === "All" || bug.status === selectedStatus;

  const matchesSeverity =
    selectedSeverity === "All" || bug.severity === selectedSeverity;

  const searchableText = [
    bug.title,
    bug.module_name || "",
    bug.error_message || ""
  ].join(" ").toLowerCase();

  const matchesSearch = searchableText.includes(searchTerm);

  return matchesStatus && matchesSeverity && matchesSearch;
});

      const totalPages = Math.max(
        1,
        Math.ceil(filteredBugs.length / pageSize)
      );

      if (currentPage > totalPages) {
        currentPage = totalPages;
      }

      if (filteredBugs.length === 0) {
        message.textContent = "No bugs found for these filters.";
        pageInfo.textContent = "Page 1 of 1";
        prevPage.disabled = true;
        nextPage.disabled = true;
        return;
      }

      message.textContent = "";

      const startIndex = (currentPage - 1) * pageSize;
      const pageBugs = filteredBugs.slice(
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

        // Status update controls
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

        // View details and screenshot
        const detailsCell = document.createElement("td");
        const detailsButton = document.createElement("button");

        detailsButton.textContent = "View Details";

        detailsButton.addEventListener("click", () => {
          const screenshotUrl = `/api/bugs/${bug.id}/screenshot`;
          const detailsWindow = window.open("", "_blank");

          if (!detailsWindow) {
            message.textContent =
              "Please allow pop-ups to view bug details.";
            return;
          }

          detailsWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Bug Details</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
              </head>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>${escapeHtml(bug.title)}</h2>
                <h3>Error Message</h3>
                <pre style="white-space: pre-wrap;">${escapeHtml(
                  bug.error_message || "No error message available"
                )}</pre>
                <h3>Screenshot</h3>
                <img id="bugScreenshot" alt="Bug screenshot"
                     style="max-width: 100%; display: none;">
                <p id="screenshotMessage">Loading screenshot...</p>
              </body>
            </html>
          `);

          detailsWindow.document.close();

          const screenshotImage =
            detailsWindow.document.getElementById("bugScreenshot");
          const screenshotMessage =
            detailsWindow.document.getElementById("screenshotMessage");

          screenshotImage.onload = () => {
            screenshotImage.style.display = "block";
            screenshotMessage.textContent = "";
          };

          screenshotImage.onerror = () => {
            screenshotMessage.textContent =
              "Screenshot unavailable. Check that the file exists.";
          };

          screenshotImage.src = screenshotUrl;
        });

        detailsCell.appendChild(detailsButton);
        row.appendChild(detailsCell);

        bugsTable.appendChild(row);
      });

      // Update pagination controls
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages;
    }

    // Avoid registering duplicate filter listeners
    statusFilter.onchange = () => {
      currentPage = 1;
      renderBugs();
    };

    severityFilter.onchange = () => {
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
      const selectedStatus = statusFilter.value;
      const selectedSeverity = severityFilter.value;

      const filteredCount = bugsData.bugs.filter(bug =>
        (selectedStatus === "All" || bug.status === selectedStatus) &&
        (selectedSeverity === "All" || bug.severity === selectedSeverity)
      ).length;

      const totalPages = Math.max(
        1,
        Math.ceil(filteredCount / pageSize)
      );

      if (currentPage < totalPages) {
        currentPage++;
        renderBugs();
      }
    };

    renderBugs();
  } catch (error) {
    console.error("Dashboard loading error:", error);
    message.textContent = "Unable to load dashboard data.";
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

loadDashboard();
