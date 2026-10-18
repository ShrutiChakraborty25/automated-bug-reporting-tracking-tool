
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

        
detailsButton.addEventListener("click", async () => {
  const modal = document.getElementById("bugModal");
  const closeButton = document.getElementById("closeModal");
  const screenshot = document.getElementById("modalBugScreenshot");
  const screenshotMessage = document.getElementById("modalScreenshotMessage");

  document.getElementById("modalBugTitle").textContent = bug.title;
  document.getElementById("modalBugModule").textContent =
    bug.module_name || "Unassigned";
  document.getElementById("modalBugSeverity").textContent = bug.severity;
  document.getElementById("modalBugStatus").textContent = bug.status;
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

  document.addEventListener("keydown", handleEscape, { once: true });

  try {
    const response = await fetch(`/api/bugs/${bug.id}/screenshot`);

    if (!response.ok) {
      throw new Error("Screenshot unavailable.");
    }

    const screenshotUrl = URL.createObjectURL(await response.blob());

    screenshot.onload = () => {
      screenshot.hidden = false;
      screenshotMessage.textContent = "";
      URL.revokeObjectURL(screenshotUrl);
    };

    screenshot.onerror = () => {
      screenshotMessage.textContent = "Unable to display screenshot.";
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
