document.addEventListener("DOMContentLoaded", function () {
    // Redirect to login if session is missing
    if (!sessionStorage.getItem("memberId")) {
        window.location.href = "/login_page/login.html";
    }
});

function getSafeRating(book) {
  if (!book.rating || typeof book.rating.AverageRating === "undefined") {
    console.log("No rating found, defaulting to 0");
    return 0;
  }

  console.log("Raw rating data:", book.rating.AverageRating, "Type:", typeof book.rating.AverageRating);

  let parsedRating = Number(book.rating.AverageRating); // Convert to number

  if (isNaN(parsedRating)) {
    console.log("Parsed rating is NaN, defaulting to 0");
    return 0;
  }

  return parsedRating;
}

// Global variable for storing fetched books
let booksData = [] 

document.addEventListener("DOMContentLoaded", async () => {
  await initializeDashboard() // Ensure books are fetched before anything else

  // Safe Event Listeners
  const addListener = (id, event, handler) => {
    const element = document.getElementById(id)
    if (element) {
      element.addEventListener(event, handler)
    } else {
      console.warn(`Element with ID '${id}' not found. Skipping event listener.`)
    }
  }

  // Add listeners safely
  addListener("search-btn", "click", searchBooks)
  addListener("search-input", "keypress", (e) => {
    if (e.key === "Enter") searchBooks()
  })
  addListener("request-loan-btn", "click", requestLoan)
  addListener("submit-review-btn", "click", submitReview)
  addListener("request-interlibrary-btn", "click", requestInterlibraryLoan)

  // Font size change
  document.getElementById("font-size").addEventListener("change", function () {
    changeFontSize(this.value)
  })

  // Update username on the dashboard
  
  console.log("Dashboard Initialized, Books Loaded:", booksData)
})

//for Big Display
document.addEventListener("DOMContentLoaded", function () {
  const userData = sessionStorage.getItem("user");

  if (userData) {
      const user = JSON.parse(userData);
      
      // ✅ Update the navbar user name
      document.getElementById("user-name").textContent = `Welcome, ${user.name}!`;

      // ✅ Update the big display welcome text
      document.getElementById("welcome-name").textContent = user.name;
      const userName = sessionStorage.getItem("userName") || "User"; 
      document.getElementById("user-name").innerText = userName;
  } else {
      
    console.error("No user data found in sessionStorage.");
  }
});

  // Theme toggle
  document.getElementById("theme-toggle").addEventListener("change", () => {
    document.documentElement.classList.toggle("dark-mode")

    // Save theme preference to localStorage
    if (document.documentElement.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark")
      showToast("Dark Mode", "Dark mode has been enabled.", "success")
    } else {
      localStorage.setItem("theme", "light")
      showToast("Light Mode", "Light mode has been enabled.", "success")
    }
  })

  // Check for saved theme preference
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark-mode")
    document.getElementById("theme-toggle").checked = true
  }

  // Star rating system
  const stars = document.querySelectorAll(".star")
  stars.forEach((star) => {
    star.addEventListener("click", function () {
      const rating = this.getAttribute("data-rating")
      document.getElementById("rating-value").value = rating

      // Update star appearance
      stars.forEach((s) => {
        if (s.getAttribute("data-rating") <= rating) {
          s.classList.add("active")
          s.querySelector("i").classList.remove("far")
          s.querySelector("i").classList.add("fas")
        } else {
          s.classList.remove("active")
          s.querySelector("i").classList.remove("fas")
          s.querySelector("i").classList.add("far")
        }
      })
    })
  })

  // Close modal
  document.querySelector(".close-modal").addEventListener("click", () => {
    document.getElementById("book-modal").style.display = "none"
    document.getElementById("overlay").style.display = "none"
  })

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("book-modal")
    if (event.target === modal) {
      modal.style.display = "none"
      document.getElementById("overlay").style.display = "none"
    }
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
    showToast("Settings Saved", "Your settings have been saved successfully.", "success")
    document.getElementById("settings-panel").classList.remove("active")
    document.getElementById("overlay").style.display = "none"
  })

  // Filter buttons
  const filterButtons = document.querySelectorAll(".filter-btn")
  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      filterButtons.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")
      // In a real app, this would filter the results
      showToast("Filter Applied", `Showing ${this.textContent} books.`, "success")
    })
  })

  // Sidebar navigation
  const navLinks = document.querySelectorAll(".sidebar-nav a")
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href")
      const targetSection = document.querySelector(targetId)

      if (targetSection) {
        // Smooth scroll to section
        window.scrollTo({
          top: targetSection.offsetTop - 80,
          behavior: "smooth",
        })

        // Update active state
        navLinks.forEach((navLink) => {
          navLink.parentElement.classList.remove("active")
        })
        this.parentElement.classList.add("active")

        // Close sidebar on mobile
        if (window.innerWidth < 576) {
          document.querySelector(".sidebar").classList.remove("active")
          document.getElementById("overlay").style.display = "none"
        }
      }
    })
  })

// Initialize Dashboard
async function initializeDashboard() {
  try {
    // Fetch books from backend
    const response = await fetch('http://localhost:5500/api/books', { mode: 'cors' });
    if (!response.ok) throw new Error("Failed to fetch books");

    // Convert response to JSON
    booksData = await response.json();  // 🔥 Store fetched books in global variable

    // Display interlibrary loan history
    displayInterlibraryHistory();

    // Set initial font size from localStorage
    // const savedFontSize = localStorage.getItem("fontsize") || "medium";
    // document.getElementById("font-size").value = savedFontSize;
    // changeFontSize(savedFontSize);
  } catch (error) {
    console.error("Error initializing dashboard:", error.message);
    showToast("Error", "Failed to load dashboard data.", "error");
  }
}

// Search Books
function searchBooks() {
  const searchInputElement = document.getElementById("search-input-bottom");
  if (!searchInputElement) {
    console.error("Search input not found!");
    return;
  }

  let searchInput = searchInputElement.value.trim().toLowerCase();
  console.log("Search Input:", searchInput);

  const searchResults = document.getElementById("search-results");
  searchResults.innerHTML = ""; // Clear previous results

  if (!searchInput) {
    showToast("Warning", "Please enter a search term.", "warning");
    searchResults.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>Enter a search term to find books</p>
      </div>
    `;
    return;
  }

  // Ensure booksData is loaded
  if (!Array.isArray(booksData) || booksData.length === 0) {
    console.error("Error: booksData is not loaded or is empty.");
    showToast("Error", "Book data is not available.", "error");
    return;
  }

  // Debug: Print book data to verify structure
  console.log("Books Data:", booksData);

  // Fetch filtered books from the backend via the updated API
  fetch(`http://localhost:5500/api/books?query=${searchInput}`)
    .then((response) => response.json())
    .then((filteredBooks) => {
      if (filteredBooks.length === 0) {
        showToast("No Results", `No books found matching "${searchInput}".`, "warning");
        searchResults.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-circle"></i>
            <p>No books found matching "${searchInput}"</p>
          </div>
        `;
        return;
      }

      // Display search results
      filteredBooks.forEach((book) => {
        const bookItem = document.createElement("div");
        bookItem.className = "book-item";
        bookItem.dataset.bookId = book.BookID; // Store BookID for easy access

        // Get the safe rating
        let bookRating = getSafeRating(book);
        console.log("Final book rating:", bookRating, "Type:", typeof bookRating);
        
        let starsHTML = "";
        for (let i = 1; i <= 5; i++) {
          if (i <= Math.floor(bookRating)) {
            starsHTML += '<i class="fas fa-star"></i>';
          } else if (i === Math.ceil(bookRating) && bookRating % 1 !== 0) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
          } else {
            starsHTML += '<i class="far fa-star"></i>';
          }
        }

        bookItem.innerHTML = `
          <div class="book-cover">
            ${book.coverUrl ? `<img src="${book.coverUrl}" alt="${book.Title} cover">` : '<i class="fas fa-book"></i>'}
          </div>
          <div class="book-info">
            <div class="book-title">${book.Title}</div>
            <div class="book-author">by ${book.Authors || "Unknown"}</div>
            <div class="book-meta">
              <span><i class="fas fa-calendar-alt"></i> ${book.PublicationYear || "N/A"}</span>
              <span><i class="fas fa-bookmark"></i> ${book.Genres || "N/A"}</span>
              <span class="book-rating">${starsHTML} ${bookRating.toFixed(1)}</span>
            </div>
          </div>
          <div class="book-status ${book.availabilityStatus?.toLowerCase().replace(" ", "-") || "unknown"}">
            ${book.availabilityStatus || "Unknown"}
          </div>
        `;

        // Updated Click Event: Fetch Book Details from API
        bookItem.addEventListener("click", () => {
          fetchBookDetails(book);
        });

        searchResults.appendChild(bookItem);
      });
    })
    .catch((error) => {
      console.error('Error fetching search results:', error);
      showToast("Error", "An error occurred while searching.", "error");
    });
}


function fetchBookDetails(book) {
  if (!book || !book.BookID) {
      console.error("Invalid book object:", book);
      alert("Invalid book details. Please try again.");
      return;
  }

  console.log("Fetching details for BookID:", book.BookID);

  fetch(`http://localhost:5500/api/view-book/${book.BookID}`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          console.log("Book Details Fetched:", data);  // Debugging
          displayBookModal(data);
      })
      .catch(error => {
          console.error("Error fetching book details:", error);
          alert("Could not fetch book details. Please try again.");
      });
}


function displayBookModal(book) {
  const modal = document.getElementById("book-modal");
  const bookDetails = document.getElementById("book-details");

  if (!modal || !bookDetails) {
      console.error("Book modal elements not found!");
      return;
  }

  console.log("Book Rating Data:", book.rating);

  // Fill modal with book details
  bookDetails.innerHTML = `
      <h2>${book.Title}</h2>
      <p><strong>Book ID:</strong> ${book.BookID}</p>
      <p><strong>Author(s):</strong> ${book.authors.map(a => a.FirstName + " " + a.LastName).join(", ") || "Unknown"}</p>
      <p><strong>Publisher:</strong> ${book.PublisherName || "Unknown"}</p>
      <p><strong>Genres:</strong> ${book.genres.map(g => g.Name).join(", ") || "Unknown"}</p>
      <p><strong>Pages:</strong> ${book.Pages || "N/A"}</p>
      <p><strong>Publication Year:</strong> ${book.PublicationYear || "N/A"}</p>
      <p><strong>Availability:</strong> ${book.availability.AvailableCopies || 0} copies available</p>
      <p><strong>Rating:</strong> 
        ${book.rating && book.rating.AverageRating 
            ? Number(book.rating.AverageRating).toFixed(1) + " ⭐" 
            : "No ratings yet"}
      </p>
      <p><strong>Reviews:</strong></p>
      <ul>
          ${book.reviews.length > 0
              ? book.reviews.map(r => `<li><strong>${r.FirstName} ${r.LastName}:</strong> ${r.ReviewText}</li>`).join("")
              : "<li>No reviews yet.</li>"}
      </ul>
  `;

  // Show the modal
  modal.style.display = "block";

  // Close modal on button click
  document.querySelector(".close-modal").onclick = () => {
      modal.style.display = "none";
  };
}



document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("book-modal");
  const closeModal = document.querySelector(".close-modal");
  const overlay = document.querySelector(".modal-overlay");

  function hideModal() {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
  }

  closeModal.addEventListener("click", hideModal);
  overlay.addEventListener("click", hideModal);

  // Optional: Close on Escape key
  document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") hideModal();
  });
});


function closeModal() {
  document.getElementById("book-details-modal").style.display = "none";
}


// Show Book Details
function showBookDetails(book) {
  const bookDetails = document.getElementById("book-details")
  const modal = document.getElementById("book-modal")
  const overlay = document.getElementById("overlay")

  // Generate stars based on rating
  let starsHTML = ""
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(book.rating)) {
      starsHTML += '<i class="fas fa-star"></i>'
    } else if (i === Math.ceil(book.rating) && book.rating % 1 !== 0) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>'
    } else {
      starsHTML += '<i class="far fa-star"></i>'
    }
  }

  // Generate reviews HTML
  let reviewsHTML = ""
  if (book.reviews && book.reviews.length > 0) {
    book.reviews.forEach((review) => {
      let reviewStars = ""
      for (let i = 1; i <= 5; i++) {
        if (i <= review.score) {
          reviewStars += '<i class="fas fa-star"></i>'
        } else {
          reviewStars += '<i class="far fa-star"></i>'
        }
      }

      reviewsHTML += `
                <div class="review-item">
                    <div class="review-rating">${reviewStars}</div>
                    <div class="review-text">"${review.text}"</div>
                    <div class="review-author">"- Member ${review.memberId}"</div>
                </div>
            `
    })
  } else {
    reviewsHTML = "<p>No reviews yet.</p>"
  }

  // Populate book details
  bookDetails.innerHTML = `
        <div class="book-details-container">
            <div class="book-details-header">
                <h2 class="book-details-title">${book.title}</h2>
                <div class="book-details-id">ID: ${book.id}</div>
            </div>
            
            <div class="book-details-main">
                <div class="book-cover-large">
                    ${book.coverUrl ? `<img src="${book.coverUrl}" alt="${book.title} cover">` : '<i class="fas fa-book"></i>'}
                </div>
                
                <div class="book-details-info">
                    <div class="book-details-author">by ${book.author}</div>
                    
                    <div class="book-details-meta">
                        <div class="meta-item">
                            <span class="meta-label">Publisher</span>
                            <span class="meta-value">${book.publisher}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Publication Year</span>
                            <span class="meta-value">${book.publicationYear}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Language</span>
                            <span class="meta-value">${book.language}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Pages</span>
                            <span class="meta-value">${book.pages}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Genre</span>
                            <span class="meta-value">${book.genre}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Status</span>
                            <span class="meta-value">${book.availabilityStatus}</span>
                        </div>
                    </div>
                    
                    <div class="book-details-rating">
                        <strong>Rating:</strong> <span class="stars">${starsHTML}</span> 
<span class="rating-value">${(Number(book.rating) || 0).toFixed(1)}/5</span>
                    
                    <div class="book-details-actions">
                        <button class="btn btn-primary" onclick="requestLoanFromModal('${book.id}')">
                            <i class="fas fa-hand-holding"></i> Request Loan
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="book-details-summary">
                <h3>Summary</h3>
                <p>${book.summary}</p>
            </div>
            
            <div class="book-details-reviews">
                <h3><i class="fas fa-comments"></i> Reviews</h3>
                ${reviewsHTML}
            </div>
        </div>
    `

  // Show modal and overlay
  modal.style.display = "block"
  overlay.style.display = "block"
}

document.addEventListener("DOMContentLoaded", function () {
  const userNameElement = document.getElementById("user-name");

  // Get stored user data
  const userName = sessionStorage.getItem("userName");

  if (userName) {
      userNameElement.textContent = `Welcome, ${userName}!`;
  } else {
      userNameElement.textContent = "Welcome, Guest!";
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const userData = JSON.parse(sessionStorage.getItem("user"));

  if (userData) {
      // ✅ Update navbar
      document.getElementById("user-name").textContent = userData.name;

      // ✅ Update big dashboard welcome message
      const dashboardWelcome = document.getElementById("dashboard-welcome");
      if (dashboardWelcome) {
          dashboardWelcome.textContent = `Welcome, ${userData.name}!`;
      }

      // ✅ Update user avatar dynamically
      const avatar = document.getElementById("user-avatar");
      if (avatar) {
          const nameForAvatar = encodeURIComponent(userData.name);
          avatar.src = `https://ui-avatars.com/api/?name=${nameForAvatar}&background=6C5CE7&color=fff`;
      }
  }
});

// Request Loan from Modal
function requestLoanFromModal(bookId) {
  document.getElementById("book-modal").style.display = "none"
  document.getElementById("overlay").style.display = "none"
  document.getElementById("book-id-input").value = bookId

  // Scroll to loan section
  const loanSection = document.getElementById("loan-section")
  window.scrollTo({
    top: loanSection.offsetTop - 80,
    behavior: "smooth",
  })

  // Highlight the input field
  document.getElementById("book-id-input").focus()
  document.getElementById("book-id-input").classList.add("highlight")

  // Remove highlight after a short delay
  setTimeout(() => {
    document.getElementById("book-id-input").classList.remove("highlight")
  }, 1500)
}

function requestLoan() {
  console.log("Request Loan button clicked!");
  const bookIdInput = document.getElementById("book-id-input").value;
  const loanMessage = document.getElementById("loan-message");

  if (!bookIdInput.trim()) {
    showToast("Error", "Please enter a Book ID.", "error");
    loanMessage.innerHTML = `<div class="message">Please enter a Book ID.</div>`;
    loanMessage.className = "message-container error";
    return;
  }

  console.log(`Requesting loan for book: ${bookIdInput}`);

  const token = sessionStorage.getItem('token');

  if (!token) {
    showToast("Error", "You need to be logged in to borrow a book.", "error");
    loanMessage.innerHTML = `<div class="message">You need to be logged in to borrow a book.</div>`;
    loanMessage.className = "message-container error";
    return;
  }

  fetch(`http://localhost:5500/api/borrow-book/${bookIdInput}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(errData => {
          throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log("Response from server:", data);

      if (data.success) {
        showToast("Success", `You have borrowed "${data.bookTitle}". Due Date: ${data.dueDate}`, "success");
        loanMessage.innerHTML = `<div class="message">Success! You have borrowed "${data.bookTitle}". Due Date: ${data.dueDate}.</div>`;
        loanMessage.className = "message-container success";
      } else {
        showToast("Error", data.message, "error");
        loanMessage.innerHTML = `<div class="message">${data.message}</div>`;
        loanMessage.className = "message-container error";
      }
    })
    .catch(error => {
      console.error("Error requesting loan:", error);
      showToast("Error", error.message || "Something went wrong. Try again later.", "error");
      loanMessage.innerHTML = `<div class="message">${error.message || "Something went wrong. Try again later."}</div>`;
      loanMessage.className = "message-container error";
    });

  document.getElementById("book-id-input").value = "";
}

// Submit Review
function submitReview() {
  let bookId = document.getElementById("book-id").value.trim();  // Get Book ID from input field
  bookId = bookId.toUpperCase(); // Convert the Book ID to uppercase here

  const rating = document.getElementById("rating-value").value;
  const reviewText = document.getElementById("review-text").value;
  const reviewMessage = document.getElementById("review-message");

  if (!bookId) {
    showToast("Error", "Please enter a book ID to review.", "error");
    reviewMessage.innerHTML = `<div class="message">Please enter a book ID to review.</div>`;
    reviewMessage.className = "message-container error";
    return;
  }

  if (rating === "0") {
    showToast("Error", "Please select a rating.", "error");
    reviewMessage.innerHTML = `<div class="message">Please select a rating.</div>`;
    reviewMessage.className = "message-container error";
    return;
  }

  if (!reviewText.trim()) {
    showToast("Error", "Please write a review.", "error");
    reviewMessage.innerHTML = `<div class="message">Please write a review.</div>`;
    reviewMessage.className = "message-container error";
    return;
  }

  // Get user token
  const token = sessionStorage.getItem("token");
  if (!token) {
    showToast("Error", "You must be logged in to submit a review.", "error");
    return;
  }

  // Send review to backend
  fetch(`http://localhost:5500/api/submit-review/${bookId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ rating, reviewText })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      showToast("Success", `Thank you for reviewing!`, "success");
      reviewMessage.innerHTML = `<div class="message">${data.message}</div>`;
      reviewMessage.className = "message-container success";

      // Clear form
      document.getElementById("book-id").value = "";  // Reset the book ID input
      document.getElementById("rating-value").value = "0";  // Reset rating
      document.getElementById("review-text").value = "";  // Reset review text

      // Reset star appearance
      const stars = document.querySelectorAll(".star");
      stars.forEach((star) => {
        star.classList.remove("active");
        star.querySelector("i").classList.remove("fas");
        star.querySelector("i").classList.add("far");
      });
    } else {
      showToast("Error", "Failed to submit review. Please try again.", "error");
    }
  })
  .catch(error => {
    console.error("Error submitting review:", error);
    showToast("Error", "Something went wrong. Try again later.", "error");
  });
}

// Request Interlibrary Loan
function requestInterlibraryLoan() {
  const bookId = document.getElementById("interlibrary-book-id").value; // Updated to book ID
  const library = document.getElementById("interlibrary-library");
  const libraryName = library.options[library.selectedIndex]?.text || "";
  const interlibraryMessage = document.getElementById("interlibrary-message");

  // Validate that bookId and library are provided
  if (!bookId.trim()) {
    showToast("Error", "Please enter a book ID.", "error");
    interlibraryMessage.innerHTML = `<div class="message">Please enter a book ID.</div>`;
    interlibraryMessage.className = "message-container error";
    return;
  }

  if (!library.value) {
    showToast("Error", "Please select a partner library.", "error");
    interlibraryMessage.innerHTML = `<div class="message">Please select a partner library.</div>`;
    interlibraryMessage.className = "message-container error";
    return;
  }

  // Prepare the data to send to the backend
  const data = {
    bookId: bookId,
    library: libraryName,
  };

  // Send the interlibrary loan request to the backend API
  fetch("http://localhost:5500/api/interlibrary-loan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + sessionStorage.getItem('token'), // Include token for authentication
    },
    body: JSON.stringify(data),
  })
    .then(response => response.json())
    .then(data => {
      if (data.message) {
        showToast("Success", data.message, "success");
        interlibraryMessage.innerHTML = `<div class="message">${data.message}</div>`;
        interlibraryMessage.className = "message-container success";
      } else {
        showToast("Error", "There was an error with your request.", "error");
        interlibraryMessage.innerHTML = `<div class="message">Error: ${data.message}</div>`;
        interlibraryMessage.className = "message-container error";
      }
    })
    .catch(error => {
      showToast("Error", "There was an error processing your request.", "error");
      console.error("Error:", error);
    });
}

// Display Interlibrary Loan History
async function displayInterlibraryHistory() {
  const interlibraryHistory = document.getElementById("interlibrary-history");

  // Clear previous results
  interlibraryHistory.innerHTML = "";

  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const memberId = user.id;
    const response = await fetch(`http://localhost:5500/api/interlibrary-loan/${memberId}`, {
      mode: 'cors',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`, // Pass the token
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch interlibrary loan history');
    }

    const loanData = await response.json();  // Assuming this returns an array of loans

    // If no loans exist, show an empty state
    if (loanData.message === "No interlibrary loan requests found") {
      interlibraryHistory.innerHTML = ` 
        <div class="empty-state">
          <i class="fas fa-exchange-alt"></i>
          <p>No loan history found</p>
        </div>
      `;
      return;
    }

    // Display each loan history entry
    loanData.forEach((loan) => {
      const loanItem = document.createElement("div");
      loanItem.className = "loan-item";

      loanItem.innerHTML = `
        <div class="loan-book-id">Book ID: ${loan.BookID}</div>
        <div class="loan-book-title">Book Title: ${loan.BookTitle}</div>
        <div class="loan-library">Library: ${loan.LibraryName}</div>
        <div class="loan-dates">
          <span><i class="fas fa-calendar-plus"></i> Requested: ${formatDate(loan.LoanDate)}. It will be available in 3 bussiness days!</span>
        </div>
      `;

      interlibraryHistory.appendChild(loanItem);
    });
  } catch (error) {
    console.error("Error displaying interlibrary loan history:", error.message);
    interlibraryHistory.innerHTML = ` 
      <div class="error-state">
        <p>Error loading loan history</p>
      </div>
    `;
  }
}

// Change Font Size
function changeFontSize(size) {
  const root = document.documentElement

  // Remove any existing font size classes
  root.classList.remove("font-small", "font-medium", "font-large")

  // Add the selected font size class
  root.classList.add(`font-${size}`)

  // Save preference to localStorage
  localStorage.setItem("fontsize", size)

  showToast("Font Size", `Font size changed to ${size}.`, "success")
}

// Logout
function logout() {
  sessionStorage.removeItem("memberId"); // or whatever key you used for login
  window.location.replace("/Finale/login_page/login.html");
}

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

// Helper Functions
function getReturnDate() {
  // Calculate return date (14 days from today)
  const returnDate = new Date()
  returnDate.setDate(returnDate.getDate() + 14)
  return formatDate(returnDate.toISOString().split("T")[0])
}

function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" }
  return new Date(dateString).toLocaleDateString("en-US", options)
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}