let booksData = [];

document.addEventListener("DOMContentLoaded", function() {
    // ✅ Check if admin is logged in
    const admin = sessionStorage.getItem("userName");
    if (!admin) {
        // Not logged in, redirect immediately
        window.location.replace("/login_page/login.html");
        return; // stop further code execution
    }

});

// DOM Elements
document.addEventListener("DOMContentLoaded", async () => {
  if (window.memberEventListenersAttached) return; // ✅ Prevent multiple event bindings
  window.memberEventListenersAttached = true;
  
  document.getElementById("add-member-btn").addEventListener("click", () => {
    document.getElementById("member-id").value = ""; // 🔥 Ensure no ID is set
    document.getElementById("member-form").reset(); // Clear form
    document.getElementById("member-modal").style.display = "block";
});


  await fetchBooks()
  // Initialize the dashboard
  initializeDashboard()

  // Set up navigation
  setupNavigation()

  // Set up panels
  setupPanels()

  // Set up font size change
  setupFontSizeChange()

})

function initializeDashboard() {
  console.log("Initializing dashboard..."); // Debugging log

  // Prevent duplicate event listeners
  if (window.themeToggleInitialized) {
    console.warn("Theme toggle already initialized, skipping...");
    return;
  }
  window.themeToggleInitialized = true;

  document.addEventListener("DOMContentLoaded", function () {
    const adminNameElement = document.getElementById("admin-name"); // Change ID if different
  
    // Get stored user data
    const adminName = sessionStorage.getItem("userName");
  
    if (adminName) {
        adminNameElement.textContent = `Welcome, ${adminName}!`;
    } else {
        adminNameElement.textContent = "Welcome, Admin!";
    }
  });

  // Check for saved theme preference
  if (sessionStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark-mode");
    document.getElementById("theme-toggle").checked = true;
  }

  setupThemeToggle(); // Call only once ✅

  // Check for saved font size
  const savedFontSize = sessionStorage.getItem("fontsize") || "medium";
  document.getElementById("font-size").value = savedFontSize;
  changeFontSize(savedFontSize);
}

// Setup Navigation
function setupNavigation() {
  const navLinks = document.querySelectorAll(".sidebar-nav a")
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetSection = this.getAttribute("data-section")

      // Hide all sections
      document.querySelectorAll(".dashboard-section").forEach((section) => {
        section.classList.remove("active")
      })

      // Show target section
      document.getElementById(targetSection).classList.add("active")

      // Update active state in navigation
      navLinks.forEach((navLink) => {
        navLink.parentElement.classList.remove("active")
      })
      this.parentElement.classList.add("active")

      // Close sidebar on mobile
      if (window.innerWidth < 576) {
        document.querySelector(".sidebar").classList.remove("active")
        document.getElementById("overlay").style.display = "none"
      }
    })
  })

  // Toggle sidebar on mobile
  document.getElementById("toggle-sidebar").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("active")
    if (document.querySelector(".sidebar").classList.contains("active")) {
      document.getElementById("overlay").style.display = "block"
    } else {
      document.getElementById("overlay").style.display = "none"
    }
  })

  // Close sidebar when clicking on overlay
  document.getElementById("overlay").addEventListener("click", function () {
    document.querySelector(".sidebar").classList.remove("active")
    document.getElementById("notifications-panel").classList.remove("active")
    document.getElementById("settings-panel").classList.remove("active")
    this.style.display = "none"
  })

  // Global search
  document.getElementById("global-search").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      const searchTerm = this.value.toLowerCase().trim()
      if (searchTerm) {
        showToast("Search", `Searching for "${searchTerm}" across all sections`, "info")
        // In a real app, this would trigger a global search
      }
    }
  })
}

// Setup Panels
function setupPanels() {
  // Notifications panel
  document.getElementById("notifications-btn").addEventListener("click", () => {
    document.getElementById("notifications-panel").classList.toggle("active")
    document.getElementById("settings-panel").classList.remove("active")
    document.getElementById("overlay").style.display = "block"
  })

  // Settings panel
  document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings-panel").classList.toggle("active")
    document.getElementById("notifications-panel").classList.remove("active")
    document.getElementById("overlay").style.display = "block"
  })

  // Close panels
  document.querySelectorAll(".close-panel").forEach((button) => {
    button.addEventListener("click", function () {
      this.closest(".side-panel").classList.remove("active")
      document.getElementById("overlay").style.display = "none"
    })
  })

  // Save settings
  document.querySelector(".settings-save").addEventListener("click", () => {
    const fontSize = document.getElementById("font-size").value
    const itemsPerPage = document.getElementById("items-per-page").value

    // Save settings to localStorage
    localStorage.setItem("fontsize", fontSize)
    localStorage.setItem("itemsPerPage", itemsPerPage)

    // Apply font size
    changeFontSize(fontSize)

    showToast("Settings Saved", "Your settings have been saved successfully.", "success")
    document.getElementById("settings-panel").classList.remove("active")
    document.getElementById("overlay").style.display = "none"
  })
}

function setupThemeToggle() {
  console.log("Setting up theme toggle...") // Debugging log

  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      document.documentElement.classList.add("dark-mode");
      sessionStorage.setItem("theme", "dark");
      showToast("Dark Mode", "Dark mode has been enabled.", "success");
    } else {
      document.documentElement.classList.remove("dark-mode");
      sessionStorage.setItem("theme", "light");
      showToast("Light Mode", "Light mode has been enabled.", "success");
    }
  });
}


// Setup Font Size Change
function setupFontSizeChange() {
  document.getElementById("font-size").addEventListener("change", function () {
    changeFontSize(this.value)
  })
}

// Change Font Size
function changeFontSize(size) {
  const root = document.documentElement

  // Remove any existing font size classes
  root.classList.remove("font-small", "font-medium", "font-large")

  // Add the selected font size class
  root.classList.add(`font-${size}`)
}

// Delete Book
async function deleteBook(bookID) {
  if (!confirm(`Are you sure you want to delete Book ID: ${bookID}?`)) return;

  const token = sessionStorage.getItem('token'); 

  if (!token) {
      showToast('⚠️ You are not authorized. Please log in again.');
      return;
  }

  try {
      const response = await fetch(`http://localhost:5500/api/delete-books/${bookID}`, {  // ✅ Ensure correct route!
          method: 'DELETE',
          headers: { 
              'Authorization': `Bearer ${token}`,  
              'Content-Type': 'application/json'
          }
      });

      console.log("🔄 Response:", response);

      const result = await response.json();  
      if (response.ok) {
          showToast("✅ Book Deleted Successfully!");
          fetchBooks(); // Refresh book list
      } else {
          showToast(`⚠️ Error: ${result.message}`);
      }
  } catch (error) {
      console.error("❌ Error deleting book:", error);
      showToast('❌ Failed to delete book.');
  }
}

document.addEventListener("DOMContentLoaded", function () {
  loadMembersTable();
});

function deleteMember(memberID) {
  if (!confirm("Are you sure you want to delete this member?")) return;

  fetch(`http://localhost:5500/api/members-delete/${memberID}`, {
      method: "DELETE",
  })
  .then(response => response.json())
  .then(result => {
      if (result.success) {
          showToast("✅ Member deleted successfully!"); // Show toast message
          loadMembersTable(); // Refresh table
      } else {
          alert("❌ Error: " + result.error);
      }
  })
  .catch(error => console.error("❌ Error deleting member:", error));
}

async function openEditMemberModal(memberID) {
  try {
      const response = await fetch(`http://localhost:5500/api/members/${memberID}`);
      if (!response.ok) throw new Error("❌ Failed to fetch member details.");

      const member = await response.json();

      // Fill modal inputs with existing member data
      document.getElementById("member-id").value = member.MemberID;
      document.getElementById("member-first-name").value = member.FirstName;
      document.getElementById("member-last-name").value = member.LastName;
      document.getElementById("member-email").value = member.Email;
      document.getElementById("member-phone").value = member.Phone;
      document.getElementById("member-type").value = member.MembershipType;
      document.getElementById("member-address").value = member.Address;
      document.getElementById("member-status").value = "Active"; // Default for now

      // Change modal title
      document.getElementById("member-modal-title").innerText = "Edit Member";

      // Open the modal
      document.getElementById("member-modal").style.display = "block";
  } catch (error) {
      console.error("❌ Error fetching member details:", error);
  }
}

// ADD AND EDIT FUNCTION
document.getElementById("member-form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const memberID = document.getElementById("member-id").value.trim(); // Get the hidden ID field
  const memberData = {
      firstName: document.getElementById("member-first-name").value.trim(),
      lastName: document.getElementById("member-last-name").value.trim(),
      email: document.getElementById("member-email").value.trim(),
      phone: document.getElementById("member-phone").value.trim(),
      address: document.getElementById("member-address").value.trim(),
      membershipType: document.getElementById("member-type").value,
  };

  // Prevent empty submission
  if (Object.values(memberData).some((field) => !field)) {
      alert("❌ All fields are required!");
      return;
  }

  let url = "http://localhost:5500/api/members-add";
  let method = "POST";

  if (memberID) { // 🔥 If memberID exists, update instead of adding
      url = `http://localhost:5500/api/members-update/${memberID}`;
      method = "PUT";
  }

  try {
      const response = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memberData),
      });

      const result = await response.json();
      if (response.ok) {
          showToast(`✅ ${memberID ? "Member updated" : "Member added"} successfully!`);
          closeMemberModal();
          loadMembersTable(); // Reload table
      } else {
          alert("❌ Error: " + result.error);
      }
  } catch (error) {
      console.error("❌ Error saving member:", error);
      alert("❌ Failed to save member.");
  }
});

// Load Loans Table
let currentPage1 = 1;
const limit = 10;

async function loadMembersTable(page = 1, searchQuery = "") {
  try {
      let url = `http://localhost:5500/api/members?page=${page}&limit=${limit}`;
      if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`❌ Request failed with status ${response.status}`);

      const data = await response.json();
      const tableBody = document.querySelector("#members-table tbody");
      tableBody.innerHTML = "";

      data.members.forEach((member) => {
          const row = `
              <tr>
                  <td>${member.MemberID}</td>
                  <td>${member.FirstName} ${member.LastName}</td>
                  <td>${member.Email}</td>
                  <td>${member.Phone}</td>
                  <td>${member.MembershipType}</td>
                  <td>${formatDate(member.MembershipDate)}</td>
                  <td>Active</td>
                  <td>
                      <button class="btn btn-sm btn-edit" data-id="${member.MemberID}">Edit</button>
                      <button class="btn btn-sm btn-delete" data-id="${member.MemberID}">Delete</button>
                  </td>
              </tr>`;
          tableBody.insertAdjacentHTML("beforeend", row); // ✅ More efficient than `innerHTML +=`
      });

      // ✅ Attach event listeners AFTER inserting elements
      document.querySelectorAll(".btn-delete").forEach((button) => {
          button.addEventListener("click", function () {
              const memberId = this.getAttribute("data-id");
              if (memberId) {
                  deleteMember(memberId);
              } else {
                  console.error("❌ Member ID is null or undefined!");
              }
          });
      });
      
      document.querySelectorAll(".btn-edit").forEach((button) => {
        button.addEventListener("click", async function () {
            const memberId = this.getAttribute("data-id");
            openEditMemberModal(memberId);
        });
    });
    

      // Update pagination
      document.getElementById("members-current-page").innerText = data.page;
      document.getElementById("members-total-pages").innerText = data.totalPages;

  } catch (error) {
      console.error("❌ Error loading members:", error);
  }
}

// Event Delegation for Edit & Delete Buttons
document.querySelector("#members-table tbody").addEventListener("click", function (e) {
  if (e.target.classList.contains("btn-edit")) {
      const memberId = e.target.getAttribute("data-id");
      console.log("Edit clicked for member:", memberId);
  }

  if (e.target.classList.contains("btn-delete")) {
      const memberId = e.target.getAttribute("data-id");
      console.log("Delete clicked for member:", memberId);
  }
});

// Search Functionality
document.getElementById("member-search-btn").addEventListener("click", () => {
  const searchQuery = document.getElementById("member-search").value.trim();
  loadMembersTable(1, searchQuery);
});

document.getElementById("member-search").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
      document.getElementById("member-search-btn").click();
  }
});

// Pagination
document.getElementById("prev-page-btn").addEventListener("click", () => {
  if (currentPage1 > 1) {
      currentPage1--;
      loadMembersTable(currentPage1);
  }
});

document.getElementById("next-page-btn").addEventListener("click", () => {
  currentPage1++;
  loadMembersTable(currentPage1);
});

// Load first page on startup
document.addEventListener("DOMContentLoaded", () => {
  loadMembersTable(currentPage1);
});

// Helper function to format dates correctly
function formatDate(isoString) {
const date = new Date(isoString);
return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

document.addEventListener("DOMContentLoaded", function () {
  const adminNameElement = document.getElementById("admin-name"); // Change ID if different

  // Get stored user data
  const adminName = sessionStorage.getItem("userName");

  if (adminName) {
      adminNameElement.textContent = `Welcome, ${adminName}!`;
  } else {
      adminNameElement.textContent = "Welcome, Admin!";
  }
});

function loadInterlibraryTable() {
  const interlibraryTable = document.getElementById("interlibrary-table").querySelector("tbody");
  interlibraryTable.innerHTML = "";

  fetch("http://127.0.0.1:5500/api/interlibrary-loans", {
    headers: {
      "Authorization": `Bearer ${sessionStorage.getItem("token")}`
    }
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch interlibrary loans");
      return response.json();
    })
    .then((interlibraryLoans) => {
      interlibraryLoans.forEach((loan) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${loan.id}</td>
          <td>${loan.title || "Unknown Title"}</td>
          <td>${loan.author || "Unknown Author"}</td>
          <td>${loan.member}</td>
          <td>${loan.library}</td>
          <td>${formatDate(loan.requestDate)}</td>
          <td>
            <button class="btn btn-sm btn-danger delete-loan" data-id="${loan.id}">
              <i class="fas fa-trash-alt"></i> Delete
            </button>
          </td>
        `;
        interlibraryTable.appendChild(row);
      });

      // Attach delete listener
      document.querySelectorAll(".delete-loan").forEach((btn) => {
        btn.addEventListener("click", () => {
          const loanId = btn.getAttribute("data-id");
          deleteInterlibraryLoan(loanId);
        });
      });
    })
    .catch((error) => {
      console.error("Error loading interlibrary loans:", error);
    });
}

function deleteInterlibraryLoan(loanId) {
  if (!confirm("Are you sure you want to delete this interlibrary loan?")) return;

  fetch(`http://127.0.0.1:5500/api/interlibrary-loans/${loanId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${sessionStorage.getItem("token")}`
    }
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to delete loan");
      showToast("Success", `Loan ${loanId} deleted.`, "success");
      loadInterlibraryTable();
    })
    .catch((error) => {
      console.error("Error deleting interlibrary loan:", error);
      showToast("Error", "Could not delete loan.", "error");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  loadInterlibraryTable();
});

// Show Toast Notification
function showToast(title, message, type) {
  const toastContainer = document.getElementById("toast-container")

  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`

  let icon = ""
  if (type === "success") {
    icon = '<i class="fas fa-check-circle"></i>'
  } else if (type === "error") {
    icon = '<i class="fas fa-exclamation-circle"></i>'
  } else if (type === "warning") {
    icon = '<i class="fas fa-exclamation-triangle"></i>'
  } else if (type === "info") {
    icon = '<i class="fas fa-info-circle"></i>'
  }

  toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `

  toastContainer.appendChild(toast)

  // Remove toast after animation completes
  setTimeout(() => {
    toast.remove()
  }, 3300)
}

// Format Date
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" }
  return new Date(dateString).toLocaleDateString("en-US", options)
}

document.addEventListener("DOMContentLoaded", function () {
  const userData = JSON.parse(sessionStorage.getItem("user"));

  if (userData) {
      // ✅ Update navbar
      document.getElementById("admin-name").textContent = userData.name;

      // ✅ Update big dashboard welcome message
      const dashboardWelcome = document.getElementById("admin-dashboard-welcome");
      if (dashboardWelcome) {
          dashboardWelcome.textContent = `Welcome, ${userData.name}!`;
      }

      // ✅ Update admin avatar dynamically
      const avatar = document.getElementById("admin-avatar");
      if (avatar) {
          const nameForAvatar = encodeURIComponent(userData.name);
          avatar.src = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=6C5CE7&color=fff`;
      }
  } 
});

async function fetchBooks() {
  try {
    const response = await fetch("http://localhost:5500/api/books");
    booksData = await response.json(); // ✅ Store in booksData globally
    allBooks = booksData;
    displayPaginatedBooks();
    return booksData; // Return books for other functions
  } catch (error) {
    console.error("Error fetching books:", error);
    return [];
  }
}

function displayBooks(books) {
  console.log("Books Data:", books);

  const tableBody = document.querySelector("#books-table tbody");
  tableBody.innerHTML = ""; // Clear previous data

  books.forEach(book => {
      const row = document.createElement("tr");

      row.innerHTML = `
          <td>${book.BookID || "Unknown"}</td>
          <td>${book.Title || "Unknown"}</td>
          <td>${book.Authors || "Unknown"}</td>
          <td>${book.PublisherName || "Unknown"}</td>
          <td>${book.Genres || "Unknown"}</td>
          <td>${book.PublicationYear || "Unknown"}</td>
          <td>${book.Pages || "N/A"}</td> 
          <td>
              <button class="edit-btn" data-id="${book.BookID}">Edit</button>
              <button class="delete-btn" data-id="${book.BookID}">Delete</button>
          </td>
      `;

      tableBody.appendChild(row);
  });

  // ✅ Attach event listeners after adding books to the table
  attachBookActions();
}

function attachBookActions() {
  document.querySelectorAll(".edit-btn").forEach(button => {
      button.addEventListener("click", function () {
          const bookId = this.getAttribute("data-id");
          console.log("Edit clicked for:", bookId);
          editBook(bookId);
      });
  });

  document.querySelectorAll(".delete-btn").forEach(button => {
      button.addEventListener("click", function () {
          const bookId = this.getAttribute("data-id");
          console.log("Delete clicked for:", bookId);
          deleteBook(bookId);
      });
  });
}

function editBook(bookId) {
  console.log("Edit clicked for:", bookId);

  // Find the book from allBooks (already loaded data)
  const book = allBooks.find(b => b.BookID === bookId);
  if (!book) {
      alert("Book not found!");
      return;
  }

  // Populate the edit form
  document.getElementById("edit-book-id").value = book.BookID;
  document.getElementById("edit-title").value = book.Title;
  document.getElementById("edit-author").value = book.Authors;
  document.getElementById("edit-publisher").value = book.PublisherName;
  document.getElementById("edit-year").value = book.PublicationYear;
  document.getElementById("edit-pages").value = book.Pages;
  document.getElementById("edit-summary").value = book.Summary;

  // ✅ **Keep genre dropdown as it is (no changes)**
  
  // Show the edit modal
  document.getElementById("edit-book-modal").style.display = "block";
}

function saveBookChanges() {
  const bookId = document.getElementById("edit-book-id").value;
  const updatedBook = {
      title: document.getElementById("edit-title").value,
      author: document.getElementById("edit-author").value,
      publisher: document.getElementById("edit-publisher").value,
      genre: document.getElementById("edit-genre").value,
      publicationYear: document.getElementById("edit-year").value,
      pages: document.getElementById("edit-pages").value,
      summary: document.getElementById("edit-summary").value,
  };

  fetch(`/api/manage-books/${bookId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBook),
  })
  .then(response => response.json())
  .then(data => {
      alert(data.message);
      closeEditModal();
      fetchBooks(); // Reload books after editing
  })
  .catch(error => console.error("Error updating book:", error));
}

function closeEditModal() {
  document.getElementById("edit-book-modal").style.display = "none";
}

document.getElementById("book-search-btn").addEventListener("click", () => {
  console.log("Books Data:", booksData); // Ensure booksdata is defined
  const query = document.getElementById("book-search").value.toLowerCase().trim();
  console.log("Search Query:", query);

  if (!query) {
    displayPaginatedBooks(); // ✅ Restore original books if search is empty
    return;
  }

  const filteredBooks = booksData.filter((book) => {
    const titleMatch = book.Title?.toLowerCase().includes(query);
    const authorMatch = book.Authors?.toLowerCase().includes(query);
    const idMatch = String(book.BookID).toLowerCase().includes(query);

    return titleMatch || authorMatch || idMatch;
  });

  console.log("Filtered Books:", filteredBooks); // Debug filtered results

  if (filteredBooks.length === 0) {
    alert("No books found.");
    return;
  }

  displayBooks(filteredBooks); // ✅ Show searched books without breaking anything
});

document.getElementById("book-filter-genre").addEventListener("change", () => applyFilters());
document.getElementById("book-filter-status").addEventListener("change", () => applyFilters());

async function applyFilters() {
  const selectedGenre = document.getElementById("book-filter-genre").value;
  const selectedStatus = document.getElementById("book-filter-status").value;

  fetchBooks().then((books) => {
    let filteredBooks = books;

    if (selectedGenre) {
      filteredBooks = filteredBooks.filter((book) => book.Genres === selectedGenre);
    }

    if (selectedStatus) {
      filteredBooks = filteredBooks.filter((book) => book.AvailabilityStatus === selectedStatus);
    }

    displayBooks(filteredBooks);
  });
}

document.getElementById("book-filter-reset").addEventListener("click", () => {
  document.getElementById("book-filter-genre").value = "";
  document.getElementById("book-filter-status").value = "";
  fetchBooks();
});

let currentPage = 1;
const booksPerPage = 5;
let allBooks = []; // Store all books here

function displayPaginatedBooks() {
  const totalPages = Math.ceil(allBooks.length / booksPerPage);
  
  // Ensure currentPage is within valid range
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  document.getElementById("total-pages").innerText = totalPages || 1;
  document.getElementById("current-page").innerText = currentPage;

  const start = (currentPage - 1) * booksPerPage;
  const paginatedBooks = allBooks.slice(start, start + booksPerPage);

  displayBooks(paginatedBooks);
}

// Pagination button click events
document.querySelectorAll(".pagination-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const pageType = btn.getAttribute("data-page");

    if (pageType === "prev" && currentPage > 1) {
      currentPage--;
    } else if (pageType === "next" && currentPage < Math.ceil(allBooks.length / booksPerPage)) {
      currentPage++;
    }

    displayPaginatedBooks();
  });
});

// Add Book Modal Handling
document.getElementById("add-book-btn").addEventListener("click", () => {
  document.getElementById("add-book-modal").style.display = "block";
  document.getElementById("overlay").style.display = "block";
  document.getElementById("add-book-form").reset();
});

function closeAddModal() {
  document.getElementById("add-book-modal").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("add-book-form").addEventListener("submit", (event) => {
      event.preventDefault();
      addBook();
  });
});

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("edit-book-modal").addEventListener("submit", (event) => {
      event.preventDefault();
      saveEditedBook();
  });
});

async function addBook() {
  const bookData = {
      title: document.getElementById('add-title').value.trim(),
      author: document.getElementById('add-author').value.trim(),
      publicationYear: document.getElementById('add-year').value.trim(),
      language: document.getElementById('add-language').value.trim(),
      pages: document.getElementById('add-pages').value.trim(),
      summary: document.getElementById('add-summary').value.trim(),
      publisher: document.getElementById('add-publisher').value.trim(),
      genre: document.getElementById('add-genre').value.trim(),
      copies: parseInt(document.getElementById('add-copies').value, 10) || 1  // Convert to number
  };

  console.log("📤 Sending book data:", bookData); // Debugging

  try {
      const response = await fetch('http://localhost:5500/api/manage-books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
          body: JSON.stringify(bookData)
      });

      const result = await response.json();
      console.log("✅ Server Response:", result); // Debugging

      if (response.ok) {
          showToast(`✅ Book added successfully! ID: ${result.bookID || 'Unknown'}`);
          closeAddModal(); // Close modal on success
      } else {
          showToast(`⚠️ Error: ${result.message || 'Something went wrong'}`);
      }
  } catch (error) {
      console.error("❌ Fetch Error:", error);
      showToast('❌ Failed to add book.');
  }
}

document.addEventListener("DOMContentLoaded", fetchBooks);

async function saveEditedBook() {
  const bookID = document.getElementById("edit-book-id").value;
  const updatedBookData = {
      title: document.getElementById("edit-title").value,
      author: document.getElementById("edit-author").value,
      publisher: document.getElementById("edit-publisher").value,
      genre: document.getElementById("edit-genre").value, // Keep dropdown as is
      publicationYear: document.getElementById("edit-year").value,
      pages: document.getElementById("edit-pages").value,
      summary: document.getElementById("edit-summary").value,
  };

  console.log("📤 Sending updated book data:", updatedBookData);

  const token = sessionStorage.getItem("token");
  if (!token) {
      showToast("⚠️ Unauthorized! Please log in.");
      return;
  }

  try {
      const response = await fetch(`http://localhost:5500/api/edit-book/${bookID}`, {
          method: "PUT",
          headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedBookData)
      });

      const result = await response.json();

      if (response.ok) {
          showToast("✅ Book updated successfully!");
          document.getElementById("edit-book-modal").style.display = "none"; // Close modal
          fetchBooks(); // Refresh the book list
      } else {
          showToast(`⚠️ Error: ${result.message}`);
      }
  } catch (error) {
      console.error("❌ Error updating book:", error);
      showToast("❌ Failed to update book.");
  }
}

function closeMemberModal() {
  document.getElementById("member-modal").style.display = "none";
  // document.getElementById("member-form").reset();
}

// document.getElementById("save-edit-btn").addEventListener("click", saveEditedBook);

async function fetchTotalBooks() {
  try {
      const response = await fetch("http://127.0.0.1:5500/api/books/count");
      if (!response.ok) throw new Error("Failed to fetch book count");

      const data = await response.json();
      document.getElementById("total-books").textContent = data.totalBooks;
  } catch (error) {
      console.error("Error updating book count:", error);
  }
}

// Call the function on page load
document.addEventListener("DOMContentLoaded", fetchTotalBooks);

// Optional: Auto-refresh book count every 30 seconds
setInterval(fetchTotalBooks, 30000);

async function fetchActiveMembers() {
  try {
      const response = await fetch("http://127.0.0.1:5500/api/members/active");
      if (!response.ok) throw new Error("Failed to fetch active members count");

      const data = await response.json();
      document.getElementById("total-members").innerText = data.activeMembers;
  } catch (error) {
      console.error("Error updating active members count:", error);
  }
}

// Fetch Active Members on Page Load
document.addEventListener("DOMContentLoaded", fetchActiveMembers);

async function fetchActiveLoans() {
  try {
      const response = await fetch("http://127.0.0.1:5500/api/loans/active"); // Check your port!
      if (!response.ok) throw new Error("Failed to fetch active loans count");

      const data = await response.json();
      document.getElementById("active-loans").innerText = data.activeLoans;
  } catch (error) {
      console.error("Error updating active loans count:", error);
  }
}

// Fetch Active Loans on Page Load
document.addEventListener("DOMContentLoaded", fetchActiveLoans);

async function fetchReturnedBooks() {
  try {
      const response = await fetch("http://127.0.0.1:5500/api/books/returned"); // Check your port!
      if (!response.ok) throw new Error("Failed to fetch returned books count");

      const data = await response.json();
      document.getElementById("returned-books").innerText = data.returnedBooks;
  } catch (error) {
      console.error("Error updating returned books count:", error);
  }
}

// Fetch Returned Books on Page Load
document.addEventListener("DOMContentLoaded", fetchReturnedBooks);

async function fetchLoans() {
  try {
    const response = await fetch("http://127.0.0.1:5500/api/loans");
    if (!response.ok) throw new Error("Failed to fetch loans data");

    const loans = await response.json();

    const searchValue = document.getElementById("loan-search").value.toLowerCase();
    const tableBody = document.querySelector("#loans-table tbody");
    tableBody.innerHTML = "";

    loans
      .filter((loan) => {
        return (
          loan.BookTitle.toLowerCase().includes(searchValue) ||
          loan.MemberName.toLowerCase().includes(searchValue) ||
          loan.LoanID.toLowerCase().includes(searchValue)
        );
      })
      .forEach((loan) => {
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${loan.LoanID}</td>
          <td>${loan.BookTitle}</td>
          <td>${loan.MemberName}</td>
          <td>${loan.LoanDate}</td>
          <td>${loan.DueDate}</td>
          <td>${loan.ReturnDate || "—"}</td>
          <td>${loan.Status}</td>
          <td>
            ${
              loan.Status.toLowerCase() === "borrowed"
                ? `<button class="btn btn-warning btn-sm" onclick="markAsReturned('${loan.LoanID}')">Mark as Returned</button>`
                : `<span class="text-success">✔️</span>`
            }
          </td>
        `;

        tableBody.appendChild(row);
      });

  } catch (error) {
    console.error("Error updating loans table:", error);
  }
}

async function markLoanAsReturned(loanId) {
  try {
      const response = await fetch(`http://127.0.0.1:5500/api/loans/${loanId}/return`, {
          method: "PUT",
      });

      if (!response.ok) throw new Error("Failed to update loan status");

      showToast("Success", `Loan ${loanId} marked as returned.`, "success");
  } catch (err) {
      console.error("Error marking loan as returned:", err);
      showToast("Error", "Could not mark loan as returned.", "error");
  }
}

async function markAsReturned(loanId) {
  try {
    const response = await fetch(`http://127.0.0.1:5500/api/loans/${loanId}/return`, {
      method: "PUT",
    });

    if (!response.ok) throw new Error("Failed to mark as returned");

    showToast("Success", `Loan ${loanId} marked as returned`, "success");
    fetchLoans(); // Refresh the table
  } catch (error) {
    console.error("Error returning loan:", error);
    showToast("Error", "Something went wrong!", "error");
  }
}


document.addEventListener("DOMContentLoaded", () => {
  fetchLoans();

  // Search on button click
  document.getElementById("loan-search-btn").addEventListener("click", fetchLoans);

  // Optional: Live search as you type
  document.getElementById("loan-search").addEventListener("input", fetchLoans);
});


document.addEventListener("DOMContentLoaded", () => {
  loadReviewsContainer();
});

function loadReviewsContainer() {
  const reviewsContainer = document.getElementById("reviews-section").querySelector(".reviews-container");
  reviewsContainer.innerHTML = "";

  fetch("http://127.0.0.1:5500/api/reviews") // Adjust URL if necessary
      .then(response => response.json())
      .then(reviews => {
          if (reviews.length === 0) {
              reviewsContainer.innerHTML = "<p>No reviews found.</p>";
              return;
          }

          reviews.forEach(review => {
              const reviewCard = document.createElement("div");
              reviewCard.className = "review-card";

              // Generate stars based on rating (assuming ratings exist)
              let starsHTML = "";
              for (let i = 1; i <= 5; i++) {
                  if (i <= review.Score) { // Assuming Score column exists in Rating table
                      starsHTML += '<i class="fas fa-star"></i>';
                  } else {
                      starsHTML += '<i class="far fa-star"></i>';
                  }
              }

              reviewCard.innerHTML = `
                  <div class="review-header">
                      <div class="review-book">${review.BookTitle}</div>
                      <div class="review-rating">${starsHTML}</div>
                  </div>
                  <div class="review-content">"${review.ReviewText}"</div>
                  <div class="review-footer">
                      <div class="review-author">- ${review.MemberName}</div>
                      <div class="review-date">${formatDate(review.ReviewDate)}</div>
                      <button class="btn btn-sm btn-danger delete-review" data-id="${review.ReviewID}">
                          <i class="fas fa-trash"></i>
                      </button>
                  </div>
              `;

              reviewsContainer.appendChild(reviewCard);
          });

          // Add event listeners to delete review buttons
          document.querySelectorAll(".delete-review").forEach(button => {
              button.addEventListener("click", function () {
                  const reviewId = this.getAttribute("data-id");
                  deleteReview(reviewId);
              });
          });
      })
      .catch(error => console.error("Error loading reviews:", error));
}

// Helper function to format date
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function deleteReview(reviewId) {
  if (confirm("Are you sure you want to delete this review?")) {
      fetch(`http://127.0.0.1:5500/api/reviews/${reviewId}`, { method: "DELETE" })
          .then(response => response.json())
          .then(result => {
              console.log(result);
              loadReviewsContainer(); // Reload reviews after deletion
              showToast("Review Deleted Successfully!"); // Show the success toast message
          })
          .catch(error => console.error("Error deleting review:", error));
  }
}

function logout() {
  sessionStorage.removeItem("userName"); // or whatever key you used for login
  window.location.replace("/Finale/login_page/login.html");
}