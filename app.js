class SmartAttendanceSystem {
  validateForm() {
    // If user is authenticated, use their information
    const name = this.currentUser ? this.currentUser.name : document.getElementById("studentName").value.trim();
    const studentId = this.currentUser ? this.currentUser.id : document.getElementById("studentId").value.trim();
    const course = document.getElementById("course").value.trim();
    const group = document.getElementById("group").value;
    const lecturer = document.getElementById("lecturer").value.trim();
    const venue = document.getElementById("venue").value.trim();
    const checkInBtn = document.getElementById("checkInBtn");

    const allFilled = name && studentId && course && group && lecturer && venue;
    const statusText = document.getElementById("locationStatus").querySelector(".status-text").textContent;
    const isDemoMode = statusText && statusText.includes("Demo Mode");
    const locationReady = !!this.currentLocation;

    // Enable by default, only disable if not demo mode and location is missing
    if (isDemoMode) {
      checkInBtn.disabled = false;
      return true;
    } else {
      checkInBtn.disabled = !(allFilled && locationReady);
      return allFilled && locationReady;
    }
  }
  constructor() {
    this.currentLocation = null
    this.currentUser = null
    this.attendanceData = []
    this.realTimeInterval = null
    this.isAuthenticated = false
    this.isSubmitting = false

    // GCTU Main Campus coordinates (Accra, Ghana)
    this.campusLocation = {
      latitude: 5.6037,
      longitude: -0.187,
      name: "Ghana Communication Technology University Main Campus",
    }

    this.init()
  }

  init() {
    this.showLoadingScreen()
    
    // Check if user is already authenticated
    if (window.database.isAuthenticated()) {
      this.currentUser = window.database.getCurrentUser()
      this.isAuthenticated = true
      this.showMainInterface()
    } else {
      this.showAuthInterface()
    }
    
    this.setupEventListeners()
    this.startRealTimeClock()
    this.getCurrentLocation()
    this.loadAttendanceData()
    this.setupCourseSearch()

    // Hide loading screen after initialization
    setTimeout(() => {
      this.hideLoadingScreen()
    }, 3000)

    // Set today's date in filter
    document.getElementById("dateFilter").value = new Date().toISOString().split("T")[0]
    
      // Populate lecturer's course filter dropdown
      const courseFilter = document.getElementById("courseFilter")
      if (courseFilter && window.gctuCourses) {
        // Remove all except the first option ("All Courses")
        courseFilter.innerHTML = '<option value="">All Courses</option>' +
          window.gctuCourses.map(course => `<option value="${course}">${course}</option>`).join("")
      }
  }

  showLoadingScreen() {
    document.getElementById("loadingScreen").style.display = "flex"
    document.getElementById("mainContainer").style.display = "none"
    document.getElementById("authContainer").style.display = "none"
  }

  hideLoadingScreen() {
    document.getElementById("loadingScreen").style.display = "none"
  }

  showAuthInterface() {
    document.getElementById("authContainer").style.display = "flex"
    document.getElementById("mainContainer").style.display = "none"
    
    // Hide user profile and show role switcher
    document.getElementById("userProfile").style.display = "none"
    document.getElementById("roleSwitcher").style.display = "flex"
  }

  showMainInterface() {
    document.getElementById("authContainer").style.display = "none"
    document.getElementById("mainContainer").style.display = "block"
    
    // Show user profile and hide role switcher
    document.getElementById("userProfile").style.display = "flex"
    document.getElementById("roleSwitcher").style.display = "none"
    
    // Update user profile information
    this.updateUserProfile()
    
    // Set the appropriate interface based on user role
    if (this.currentUser.role === "student") {
      this.switchRole("student")
      this.preFillStudentForm()
    } else {
      this.switchRole("lecturer")
      this.updateLecturerInterface()
    }
  }

  updateUserProfile() {
    if (this.currentUser) {
      document.getElementById("userDisplayName").textContent = this.currentUser.name
      document.getElementById("userRole").textContent = this.currentUser.role
    }
  }

  preFillStudentForm() {
    // Pre-fill student information in the form
    if (this.currentUser && this.currentUser.role === "student") {
      document.getElementById("studentName").value = this.currentUser.name
      document.getElementById("studentId").value = this.currentUser.id
      
      // Make these fields read-only since they're from the user's profile
      document.getElementById("studentName").readOnly = true
      document.getElementById("studentId").readOnly = true
      
      // Add visual indication that these are pre-filled
      document.getElementById("studentName").style.backgroundColor = "#f8f9fa"
      document.getElementById("studentId").style.backgroundColor = "#f8f9fa"
    }
  }

  updateLecturerInterface() {
    // Update lecturer interface with user information
    if (this.currentUser && this.currentUser.role === "lecturer") {
      document.getElementById("lecturerName").textContent = `Welcome, ${this.currentUser.name}`
    }
  }

  // Authentication Methods
  async handleStudentLogin(e) {
    e.preventDefault()
    const studentId = document.getElementById("studentLoginId").value.trim()
    const password = document.getElementById("studentLoginPassword").value.trim()

    if (!studentId || !password) {
      this.showAuthMessage("Please fill in all fields", "error")
      return
    }

    try {
      const result = await window.database.signIn({
        studentId,
        password,
        role: "student"
      })

      this.currentUser = result.user
      this.isAuthenticated = true
      this.showMainInterface()
      this.showAuthMessage("Login successful! Welcome back.", "success")
    } catch (error) {
      this.showAuthMessage(error.message, "error")
    }
  }

  async handleLecturerLogin(e) {
    e.preventDefault()
    const email = document.getElementById("lecturerLoginEmail").value.trim()
    const password = document.getElementById("lecturerLoginPassword").value.trim()

    if (!email || !password) {
      this.showAuthMessage("Please fill in all fields", "error")
      return
    }

    try {
      const result = await window.database.signIn({
        email,
        password,
        role: "lecturer"
      })

      this.currentUser = result.user
      this.isAuthenticated = true
      this.showMainInterface()
      this.showAuthMessage("Login successful! Welcome to the lecturer dashboard.", "success")
    } catch (error) {
      this.showAuthMessage(error.message, "error")
    }
  }

  async handleStudentSignup(e) {
    e.preventDefault()
    const name = document.getElementById("studentSignupName").value.trim()
    const studentId = document.getElementById("studentSignupId").value.trim()
    const email = document.getElementById("studentSignupEmail").value.trim()
    const password = document.getElementById("studentSignupPassword").value
    const confirmPassword = document.getElementById("studentSignupConfirmPassword").value

    // Validation
    if (!name || !studentId || !email || !password || !confirmPassword) {
      this.showAuthMessage("Please fill in all fields", "error")
      return
    }

    if (password !== confirmPassword) {
      this.showAuthMessage("Passwords do not match", "error")
      return
    }

    if (password.length < 6) {
      this.showAuthMessage("Password must be at least 6 characters long", "error")
      return
    }

    try {
      const result = await window.database.signUp({
        name,
        studentId,
        email,
        password,
        role: "student",
        department: "Student"
      })

      this.showAuthMessage("Account created successfully! Please login.", "success")
      this.switchAuthTab("student-login")
      document.getElementById("studentSignupForm").reset()
    } catch (error) {
      this.showAuthMessage(error.message, "error")
    }
  }

  async handleLecturerSignup(e) {
    e.preventDefault()
    const name = document.getElementById("lecturerSignupName").value.trim()
    const email = document.getElementById("lecturerSignupEmail").value.trim()
    const department = document.getElementById("lecturerSignupDepartment").value
    const password = document.getElementById("lecturerSignupPassword").value
    const confirmPassword = document.getElementById("lecturerSignupConfirmPassword").value

    // Validation
    if (!name || !email || !department || !password || !confirmPassword) {
      this.showAuthMessage("Please fill in all fields", "error")
      return
    }

    if (password !== confirmPassword) {
      this.showAuthMessage("Passwords do not match", "error")
      return
    }

    if (password.length < 6) {
      this.showAuthMessage("Password must be at least 6 characters long", "error")
      return
    }

    if (!email.endsWith("@gctu.edu.gh")) {
      this.showAuthMessage("Please use a valid GCTU email address", "error")
      return
    }

    try {
      const result = await window.database.signUp({
        name,
        email,
        password,
        role: "lecturer",
        department
      })

      this.showAuthMessage("Account created successfully! Please login.", "success")
      this.switchAuthTab("lecturer-login")
      document.getElementById("lecturerSignupForm").reset()
    } catch (error) {
      this.showAuthMessage(error.message, "error")
    }
  }

  switchAuthTab(tabName) {
    // Hide all forms
    document.querySelectorAll('.auth-form').forEach(form => {
      form.classList.remove('active')
    })
    
    // Remove active class from all tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.remove('active')
    })
    
    // Show selected form and activate tab
    document.getElementById(tabName).classList.add('active')
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active')
  }

  showAuthMessage(text, type) {
    // Create a temporary message element
    const message = document.createElement('div')
    message.className = `auth-message ${type}`
    message.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
      <span>${text}</span>
    `
    
    // Add to auth wrapper
    const authWrapper = document.querySelector('.auth-wrapper')
    authWrapper.appendChild(message)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove()
      }
    }, 5000)
  }

  async handleLogout() {
    try {
      await window.database.signOut()
      this.isAuthenticated = false
      this.currentUser = null
      this.stopRealTimeUpdates()

      // Reset all forms
      document.getElementById("studentForm").reset()
      document.getElementById("authForm").reset()
      document.getElementById("studentLoginForm").reset()
      document.getElementById("lecturerLoginForm").reset()
      document.getElementById("studentSignupForm").reset()
      document.getElementById("lecturerSignupForm").reset()

      // Show auth interface
      this.showAuthInterface()
      this.switchAuthTab("student-login")
      
      this.showMessage("Logged out successfully.", "success")
    } catch (error) {
      this.showMessage("Logout failed", "error")
    }
  }

  startRealTimeClock() {
    const updateClock = () => {
      const now = new Date()
      const timeString = now.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      const clockElement = document.getElementById("realTimeClock")
      if (clockElement) {
        clockElement.textContent = timeString
      }
    }

    updateClock()
    setInterval(updateClock, 1000)
  }

  switchRole(role) {
    // Hide both interfaces first
    document.getElementById("studentInterface").classList.remove("active")
    document.getElementById("lecturerInterface").classList.remove("active")
    document.getElementById("lecturerAuth").classList.remove("active")

    if (role === "student") {
      document.getElementById("studentInterface").classList.add("active")
      this.showMessage("Switched to Student mode.", "info")
    } else if (role === "lecturer") {
      // If not authenticated, show auth form; else show lecturer dashboard
      if (this.isAuthenticated) {
        document.getElementById("lecturerInterface").classList.add("active")
      } else {
        document.getElementById("lecturerAuth").classList.add("active")
      }
      this.showMessage("Switched to Lecturer mode.", "info")
    }
  }

  setupEventListeners() {
    // Role switcher
    document.getElementById("studentBtn").addEventListener("click", () => this.switchRole("student"))
    document.getElementById("lecturerBtn").addEventListener("click", () => this.switchRole("lecturer"))

    // Student form
    document.getElementById("studentForm").addEventListener("submit", (e) => this.handleCheckIn(e))

    // Authentication form
    document.getElementById("authForm").addEventListener("submit", (e) => this.handleAuthentication(e))

    // New authentication forms
    document.getElementById("studentLoginForm").addEventListener("submit", (e) => this.handleStudentLogin(e))
    document.getElementById("lecturerLoginForm").addEventListener("submit", (e) => this.handleLecturerLogin(e))
    document.getElementById("studentSignupForm").addEventListener("submit", (e) => this.handleStudentSignup(e))
    document.getElementById("lecturerSignupForm").addEventListener("submit", (e) => this.handleLecturerSignup(e))

    // Auth tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab')
        this.switchAuthTab(tabName)
      })
    })

    // Switch between login and signup
    document.querySelectorAll('.switch-to-signup').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const role = link.getAttribute('data-role')
        this.switchAuthTab(`${role}-signup`)
      })
    })

    document.querySelectorAll('.switch-to-login').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const role = link.getAttribute('data-role')
        this.switchAuthTab(`${role}-login`)
      })
    })

    // Logout buttons
    document.getElementById("logoutBtn").addEventListener("click", () => this.handleLogout())
    document.getElementById("headerLogoutBtn").addEventListener("click", () => this.handleLogout())

    // Lecturer controls
    document.getElementById("courseFilter").addEventListener("change", () => this.filterAttendance())
    document.getElementById("groupFilter").addEventListener("change", () => this.filterAttendance())
    document.getElementById("dateFilter").addEventListener("change", () => this.filterAttendance())
    document.getElementById("refreshBtn").addEventListener("click", () => this.refreshData())
    document.getElementById("exportBtn").addEventListener("click", () => this.exportToCSV())

    // Modal
    document.getElementById("modalClose").addEventListener("click", () => this.hideModal())
    document.getElementById("modalCancel").addEventListener("click", () => this.hideModal())
    document.getElementById("modalConfirm").addEventListener("click", () => this.confirmAction())
  }

  setupCourseSearch() {
    const courseSearch = document.getElementById("courseSearch")
    const courseDropdown = document.getElementById("courseDropdown")
    const courseHidden = document.getElementById("course")

    courseSearch.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      if (searchTerm.length < 2) {
        courseDropdown.classList.add("hidden");
        return;
      }
      const filteredCourses = window.gctuCourses.filter((course) => course.toLowerCase().includes(searchTerm));
      if (filteredCourses.length > 0) {
        courseDropdown.innerHTML = filteredCourses
          .map((course) => `<div class="course-option" data-course="${course}">${course}</div>`)
          .join("");
        courseDropdown.classList.remove("hidden");

        // Add click event to each course option
        Array.from(courseDropdown.querySelectorAll('.course-option')).forEach(option => {
          option.addEventListener('click', () => {
            courseHidden.value = option.getAttribute('data-course');
            courseSearch.value = option.getAttribute('data-course');
            courseDropdown.classList.add('hidden');
          });
        });
      } else {
        courseDropdown.classList.add("hidden");
      }
    });
  }

  handleAuthentication(e) {
    e.preventDefault()

    const email = document.getElementById("lecturerEmail").value.trim()
    const password = document.getElementById("lecturerPassword").value.trim()

    // Demo credentials
    if (email === "lecturer@gctu.edu.gh" && password === "gctu2024") {
      this.isAuthenticated = true
      this.currentUser = {
        name: "Dr. John Doe",
        email: email,
        role: "lecturer",
      }

      document.getElementById("lecturerName").textContent = `Welcome, ${this.currentUser.name}`
      document.getElementById("lecturerAuth").classList.remove("active")
      document.getElementById("lecturerInterface").classList.add("active")

      this.loadAttendanceData()
      this.startRealTimeUpdates()
      this.showMessage("Authentication successful! Welcome to the lecturer dashboard.", "success")
    } else {
      this.showMessage("Invalid credentials. Please check your email and password.", "error")
    }
  }

  getCurrentLocation() {
    const statusElement = document.getElementById("locationStatus")
    const statusIcon = statusElement.querySelector(".status-icon")
    const statusText = statusElement.querySelector(".status-text")
    const locationDetails = document.getElementById("locationDetails")

    if (!navigator.geolocation) {
      statusIcon.innerHTML = '<i class="fas fa-times-circle text-error"></i>'
      statusText.textContent = "Geolocation not supported by this browser"
      this.showMessage("Geolocation not supported", "error")
      return
    }

    statusIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
    statusText.textContent = "Verifying GCTU campus location..."

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        }

        const distance = this.calculateDistance(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          this.campusLocation.latitude,
          this.campusLocation.longitude,
        )

        locationDetails.innerHTML = `
          <strong>Your Location:</strong> ${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}<br>
          <strong>GCTU Campus:</strong> ${this.campusLocation.latitude.toFixed(6)}, ${this.campusLocation.longitude.toFixed(6)}<br>
          <strong>Distance from campus:</strong> ${distance.toFixed(2)}km<br>
          <strong>Accuracy:</strong> ±${Math.round(this.currentLocation.accuracy)}m
        `

        // Check if within GCTU campus (2km radius for flexibility)
        if (distance <= 2.0) {
          statusIcon.innerHTML = '<i class="fas fa-check-circle text-success"></i>'
          statusText.textContent = "✅ On GCTU Campus - Ready to check in"
          statusElement.style.background = "var(--light-blue)"
          statusElement.style.borderLeft = "5px solid var(--success)"
          this.validateForm()
          this.showMessage("Location verified - You're on GCTU campus!", "success")
        } else {
          statusIcon.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i>'
          statusText.textContent = "❌ Not on GCTU campus - Cannot check in"
          statusElement.style.background = "#fef3c7"
          statusElement.style.borderLeft = "5px solid var(--error)"
          this.showMessage("You must be on GCTU campus to check in", "error")
        }
      },
      (error) => {
        console.log("Geolocation error:", error)

        // For demo purposes, simulate GCTU location if permission denied
        this.currentLocation = {
          latitude: this.campusLocation.latitude,
          longitude: this.campusLocation.longitude,
          accuracy: 50,
          timestamp: new Date().toISOString(),
        }

        statusIcon.innerHTML = '<i class="fas fa-check-circle text-success"></i>'
        statusText.textContent = "✅ Demo Mode - GCTU Campus Location"
        statusElement.style.background = "var(--light-blue)"
        statusElement.style.borderLeft = "5px solid var(--success)"

        locationDetails.innerHTML = `
          <strong>Demo Mode:</strong> Using GCTU campus location<br>
          <strong>Campus Location:</strong> ${this.currentLocation.latitude.toFixed(6)}, ${this.currentLocation.longitude.toFixed(6)}<br>
          <strong>Status:</strong> Ready for check-in
        `

        this.validateForm()
        this.showMessage("Demo mode: GCTU campus location enabled", "success")
      },
      options,
    )
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  async handleCheckIn(e) {
    e.preventDefault()

    // DEMO MODE: bypass all validation and location checks
    const statusText = document.getElementById("locationStatus").querySelector(".status-text").textContent
    const isDemoMode = statusText && statusText.includes("Demo Mode")

    const checkInBtn = document.getElementById("checkInBtn")
    const btnLoading = checkInBtn.querySelector(".btn-loading")

    // Show loading state
    checkInBtn.disabled = true
    btnLoading.classList.remove("hidden")
    checkInBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Checking In... <div class="btn-loading"><i class="fas fa-spinner fa-spin"></i></div>'

    // Use logged-in user information if available
    const formData = {
      name: this.currentUser ? this.currentUser.name : document.getElementById("studentName").value.trim(),
      studentId: this.currentUser ? this.currentUser.id : document.getElementById("studentId").value.trim(),
      course: document.getElementById("course").value,
      group: document.getElementById("group").value,
      lecturer: document.getElementById("lecturer").value.trim(),
      venue: document.getElementById("venue").value.trim(),
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
      location: this.currentLocation,
    }

    if (isDemoMode) {
      // Directly add to mock database and refresh lecturer table
      window.database.ref("attendance").push(formData).then(() => {
        this.showMessage(`✅ Check-in successful! Your attendance has been recorded.`, "success")
        // Only reset non-user fields
        document.getElementById("course").value = ""
        document.getElementById("group").value = ""
        document.getElementById("lecturer").value = ""
        document.getElementById("venue").value = ""
        document.getElementById("courseSearch").value = ""
        checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check-In Successful!'
        checkInBtn.style.background = "linear-gradient(135deg, var(--success) 0%, #059669 100%)"
        setTimeout(() => {
          this.resetCheckInButton()
          this.validateForm()
        }, 2000)
        this.loadAttendanceData()
      })
      .catch(() => {
        this.showMessage("❌ Demo check-in failed.", "error")
        this.resetCheckInButton()
      })
      return
    }

    // ...existing code for normal mode (location, validation, duplicate checks)...
    // Prevent double submission
    if (this.isSubmitting) {
      return
    }
    if (!this.currentLocation) {
      this.showMessage("❌ Location not available. Please refresh and try again.", "error")
      return
    }
    if (!this.validateForm()) {
      this.showMessage("❌ Please complete all required fields before checking in.", "error")
      return
    }
    // ...existing code...
    // Validate required fields again
    if (
      !formData.name ||
      !formData.studentId ||
      !formData.course ||
      !formData.group ||
      !formData.lecturer ||
      !formData.venue
    ) {
      this.showMessage("❌ Please fill in all required fields", "error")
      this.resetCheckInButton()
      return
    }
    // Check for duplicate check-in
    const duplicateKey = `${formData.studentId}-${formData.course}-${formData.group}-${formData.date}`
    const existingCheckIns = JSON.parse(localStorage.getItem("checkInKeys") || "[]")
    if (existingCheckIns.includes(duplicateKey)) {
      this.showMessage("⚠️ You have already checked in for this course and group today!", "warning")
      this.resetCheckInButton()
      return
    }
    try {
      this.showMessage("📍 Processing your check-in...", "warning")
      const savePromise = window.database.ref("attendance").push(formData)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 10000))
      await Promise.race([savePromise, timeoutPromise])
      existingCheckIns.push(duplicateKey)
      localStorage.setItem("checkInKeys", JSON.stringify(existingCheckIns))
      this.showMessage(`✅ Check-in successful for ${formData.course} - Group ${formData.group}!`, "success")
      // Only reset non-user fields
      document.getElementById("course").value = ""
      document.getElementById("group").value = ""
      document.getElementById("lecturer").value = ""
      document.getElementById("venue").value = ""
      document.getElementById("courseSearch").value = ""
      checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check-In Successful!'
      checkInBtn.style.background = "linear-gradient(135deg, var(--success) 0%, #059669 100%)"
      setTimeout(() => {
        this.resetCheckInButton()
        this.validateForm()
      }, 2000)
    } catch (error) {
      console.error("Check-in error:", error)
      this.showMessage("❌ Check-in failed. Please try again.", "error")
      this.resetCheckInButton()
    }
  }

  resetCheckInButton() {
    this.isSubmitting = false
    const checkInBtn = document.getElementById("checkInBtn")
    const btnLoading = checkInBtn.querySelector(".btn-loading")

    checkInBtn.disabled = false
    btnLoading.classList.add("hidden")

    // Reset to default state
    this.validateForm()
  }

  // All QR code related methods have been removed to fix syntax errors and restore class structure.


  async loadAttendanceData() {
    try {
      const snapshot = await window.database.ref("attendance").once("value")
      const data = snapshot.val() || {}

      this.attendanceData = Object.values(data)
      this.renderAttendanceTable(this.attendanceData)
      this.updateStats(this.attendanceData)
      this.updateLastUpdated()

      // Set up real-time listener
      window.database.ref("attendance").on("value", (snapshot) => {
        const data = snapshot.val() || {}
        this.attendanceData = Object.values(data)
        this.renderAttendanceTable(this.attendanceData)
        this.updateStats(this.attendanceData)
        this.updateLastUpdated()
      })
    } catch (error) {
      console.error("Failed to load attendance data:", error)
      this.showMessage("Failed to load attendance data", "error")
    }
  }

  renderAttendanceTable(data) {
    const tbody = document.getElementById("attendanceBody")
    const noRecords = document.getElementById("noRecords")
    const courseFilter = document.getElementById("courseFilter").value
    const groupFilter = document.getElementById("groupFilter").value
    const dateFilter = document.getElementById("dateFilter").value

    // Filter data
    let filteredData = [...data]
    if (courseFilter) {
      filteredData = filteredData.filter((record) => record.course === courseFilter)
    }
    if (groupFilter) {
      filteredData = filteredData.filter((record) => record.group === groupFilter)
    }
    if (dateFilter) {
      filteredData = filteredData.filter((record) => record.date === dateFilter)
    }

    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Update record count
    document.getElementById("recordCount").textContent = filteredData.length

    if (filteredData.length === 0) {
      tbody.innerHTML = ""
      noRecords.classList.remove("hidden")
    } else {
      noRecords.classList.add("hidden")
      tbody.innerHTML = filteredData
        .map(
          (record, index) => `
          <tr style="animation: fadeIn 0.3s ease ${index * 0.1}s both;">
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-user-circle" style="color: var(--primary-blue);"></i>
                  ${record.name}
                </div>
              </td>
              <td><strong>${record.studentId}</strong></td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-book" style="color: var(--primary-yellow);"></i>
                  <span style="font-size: 0.9rem;">${record.course}</span>
                </div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-users" style="color: var(--primary-blue);"></i>
                  <span style="background: var(--primary-yellow); color: var(--dark-blue); padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 0.8rem;">
                    Group ${record.group}
                  </span>
                </div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-chalkboard-teacher" style="color: var(--success);"></i>
                  ${record.lecturer || "N/A"}
                </div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-map-marker-alt" style="color: var(--error);"></i>
                  ${record.venue || "N/A"}
                </div>
              </td>
              <td>${new Date(record.timestamp).toLocaleString()}</td>
              <td>
                <span class="status-present">
                  <i class="fas fa-check"></i>
                  Present
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 5px;">
                  <button onclick="attendanceSystem.viewDetails('${record.id}')" class="action-btn" style="padding: 5px 10px; font-size: 0.8rem;">
                    <i class="fas fa-eye"></i>
                    View
                  </button>
                  <button onclick="attendanceSystem.editRecord('${record.id}')" class="action-btn edit" style="padding: 5px 10px; font-size: 0.8rem;">
                    <i class="fas fa-edit"></i>
                    Edit
                  </button>
                  <button onclick="attendanceSystem.deleteRecord('${record.id}')" class="action-btn danger" style="padding: 5px 10px; font-size: 0.8rem;">
                    <i class="fas fa-trash"></i>
                    Delete
                  </button>
                </div>
              </td>
          </tr>
        `,
        )
        .join("")
    }
  }

  updateStats(data) {
    const today = new Date().toISOString().split("T")[0]
    const todayRecords = data.filter((record) => record.date === today)

    // Calculate unique students today
    const uniqueStudents = new Set(todayRecords.map((record) => record.studentId)).size

    // Calculate total unique students
    const totalUniqueStudents = new Set(data.map((record) => record.studentId)).size

    // Calculate attendance rate (assuming 500 total enrolled students at GCTU)
    const totalEnrolled = 500
    const attendanceRate = totalUniqueStudents > 0 ? Math.round((uniqueStudents / totalEnrolled) * 100) : 0

    document.getElementById("todayCount").textContent = todayRecords.length
  document.getElementById("activeCount").textContent = 0
    document.getElementById("totalCount").textContent = totalUniqueStudents
    document.getElementById("attendanceRate").textContent = `${attendanceRate}%`
  }

  updateLastUpdated() {
    document.getElementById("lastUpdated").textContent = new Date().toLocaleString()
  }

  startRealTimeUpdates() {
    if (this.realTimeInterval) return

    this.realTimeInterval = setInterval(() => {
      this.updateLastUpdated()
    }, 30000) // Update every 30 seconds
  }

  stopRealTimeUpdates() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval)
      this.realTimeInterval = null
    }
  }

  filterAttendance() {
    this.renderAttendanceTable(this.attendanceData)
    this.showMessage("Attendance data filtered", "success")
  }

  refreshData() {
    const refreshBtn = document.getElementById("refreshBtn")
    const originalText = refreshBtn.innerHTML

    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...'
    refreshBtn.disabled = true

    setTimeout(() => {
      this.loadAttendanceData()
      refreshBtn.innerHTML = originalText
      refreshBtn.disabled = false
      this.showMessage("Data refreshed successfully!", "success")
    }, 1000)
  }

  exportToCSV() {
    const courseFilter = document.getElementById("courseFilter").value
    const groupFilter = document.getElementById("groupFilter").value
    const dateFilter = document.getElementById("dateFilter").value

    let filteredData = [...this.attendanceData]
    if (courseFilter) {
      filteredData = filteredData.filter((record) => record.course === courseFilter)
    }
    if (groupFilter) {
      filteredData = filteredData.filter((record) => record.group === groupFilter)
    }
    if (dateFilter) {
      filteredData = filteredData.filter((record) => record.date === dateFilter)
    }

    if (filteredData.length === 0) {
      this.showMessage("No data to export", "warning")
      return
    }

    const headers = [
      "Name",
      "Student ID",
      "Course",
      "Group",
      "Lecturer",
      "Venue",
      "Check-in Time",
      "Date",
      "Latitude",
      "Longitude",
      "Accuracy",
      "QR Code",
    ]
    const csvContent = [
      headers.join(","),
      ...filteredData.map((record) =>
        [
          `"${record.name}"`,
          `"${record.studentId}"`,
          `"${record.course}"`,
          `"${record.group || "N/A"}"`,
          `"${record.lecturer || "N/A"}"`,
          `"${record.venue || "N/A"}"`,
          `"${new Date(record.timestamp).toLocaleString()}"`,
          `"${record.date}"`,
          record.location ? record.location.latitude : "N/A",
          record.location ? record.location.longitude : "N/A",
          record.location ? record.location.accuracy : "N/A",
          // ...QR code removed from CSV...
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")

    const filename = `GCTU_attendance_${dateFilter || "all"}_${courseFilter ? courseFilter.replace(/\s+/g, "_") : "all_courses"}_${groupFilter ? `group_${groupFilter}` : "all_groups"}_${new Date().toISOString().split("T")[0]}.csv`

    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)

    this.showMessage(`Attendance exported successfully! (${filteredData.length} records)`, "success")
  }

  viewDetails(recordId) {
    const record = this.attendanceData.find((r) => r.id === recordId)
    if (!record) return

    this.showModal(
      "Attendance Details",
      `
      <div style="text-align: left;">
        <p><strong>Name:</strong> ${record.name}</p>
        <p><strong>Student ID:</strong> ${record.studentId}</p>
        <p><strong>Course:</strong> ${record.course}</p>
        <p><strong>Group:</strong> ${record.group || "N/A"}</p>
        <p><strong>Lecturer:</strong> ${record.lecturer || "N/A"}</p>
        <p><strong>Venue:</strong> ${record.venue || "N/A"}</p>
        <p><strong>Check-in Time:</strong> ${new Date(record.timestamp).toLocaleString()}</p>
        <p><strong>Date:</strong> ${record.date}</p>
        ${
          record.location
            ? `
          <p><strong>Location:</strong> ${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}</p>
          <p><strong>Accuracy:</strong> ±${Math.round(record.location.accuracy)}m</p>
        `
            : ""
        }
  <!-- QR code removed -->
      </div>
    `,
    )
  }

  editRecord(recordId) {
    const record = this.attendanceData.find((r) => r.id === recordId)
    if (!record) return

    // Build editable form
    const courseOptions = window.gctuCourses.map(course => `<option value="${course}"${course === record.course ? " selected" : ""}>${course}</option>`).join("")
    const groupOptions = ["A","B","C","D"].map(group => `<option value="${group}"${group === record.group ? " selected" : ""}>Group ${group}</option>`).join("")

    this.showModal(
      "Edit Attendance Record",
      `
      <form id="editAttendanceForm" style="text-align: left;">
        <label><strong>Name:</strong><br>
          <input type="text" id="editName" value="${record.name}" required>
        </label><br>
        <label><strong>Student ID:</strong><br>
          <input type="text" id="editStudentId" value="${record.studentId}" required>
        </label><br>
        <label><strong>Course:</strong><br>
          <select id="editCourse" required>${courseOptions}</select>
        </label><br>
        <label><strong>Group:</strong><br>
          <select id="editGroup" required><option value="">Select Group</option>${groupOptions}</select>
        </label><br>
        <label><strong>Lecturer:</strong><br>
          <input type="text" id="editLecturer" value="${record.lecturer}" required>
        </label><br>
        <label><strong>Venue:</strong><br>
          <input type="text" id="editVenue" value="${record.venue}" required>
        </label><br>
      </form>
      <br>
      <p>Update the fields and click Confirm to save changes.</p>
      `,
      async () => {
        // Get updated values
        const updated = {
          name: document.getElementById("editName").value.trim(),
          studentId: document.getElementById("editStudentId").value.trim(),
          course: document.getElementById("editCourse").value,
          group: document.getElementById("editGroup").value,
          lecturer: document.getElementById("editLecturer").value.trim(),
          venue: document.getElementById("editVenue").value.trim(),
        }
        // Validate
        if (!updated.name || !updated.studentId || !updated.course || !updated.group || !updated.lecturer || !updated.venue) {
          this.showMessage("Please fill in all fields.", "error")
          return
        }
        // Update in mock database
        const attendanceData = JSON.parse(localStorage.getItem("attendanceData") || "{}")
        if (attendanceData.attendance && attendanceData.attendance[record.id]) {
          Object.assign(attendanceData.attendance[record.id], updated)
          localStorage.setItem("attendanceData", JSON.stringify(attendanceData))
          window.database.data = attendanceData
          window.database.notifyListeners("attendance")
          this.showMessage("Attendance record updated successfully.", "success")
          this.loadAttendanceData()
        } else {
          this.showMessage("Failed to update record.", "error")
        }
        this.hideModal()
      }
    )
  }

  deleteRecord(recordId) {
    const record = this.attendanceData.find((r) => r.id === recordId)
    if (!record) return

    this.showModal(
      "Delete Attendance Record",
      `
      <div style="text-align: left;">
        <p><strong>Student:</strong> ${record.name} (${record.studentId})</p>
        <p><strong>Course:</strong> ${record.course}</p>
        <p><strong>Date:</strong> ${record.date}</p>
        <br>
        <p style="color: var(--error);"><strong>Warning:</strong> This action cannot be undone!</p>
      </div>
    `,
      async () => {
        try {
          await window.database.ref("attendance").remove(recordId)
          this.showMessage("Attendance record deleted successfully", "success")
          this.loadAttendanceData()
        } catch (error) {
          this.showMessage("Failed to delete record", "error")
        }
      },
    )
  }

  showModal(title, message, confirmCallback = null) {
    document.getElementById("modalTitle").textContent = title
    document.getElementById("modalMessage").innerHTML = message
    document.getElementById("modal").classList.remove("hidden")

    if (confirmCallback) {
      this.pendingConfirmAction = confirmCallback
      document.getElementById("modalConfirm").style.display = "block"
    } else {
      document.getElementById("modalConfirm").style.display = "none"
    }
  }

  hideModal() {
    document.getElementById("modal").classList.add("hidden")
    this.pendingConfirmAction = null
  }

  confirmAction() {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction()
    }
    this.hideModal()
  }

  showMessage(text, type) {
    const container = document.getElementById("messageContainer")
    const message = document.createElement("div")
    message.className = `message ${type}`

    const icon =
      type === "success"
        ? "check-circle"
        : type === "error"
          ? "times-circle"
          : type === "warning"
            ? "exclamation-triangle"
            : "info-circle"

    message.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${text}</span>
    `

    container.appendChild(message)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.remove()
      }
    }, 5000)

    // Add click to dismiss
    message.addEventListener("click", () => {
      message.remove()
    })
  }
}

// Initialize the application
let attendanceSystem
document.addEventListener("DOMContentLoaded", () => {
  attendanceSystem = new SmartAttendanceSystem()
})

// Handle page visibility changes for real-time updates
document.addEventListener("visibilitychange", () => {
  if (attendanceSystem) {
    if (document.hidden) {
      attendanceSystem.stopRealTimeUpdates()
    } else {
      const lecturerInterface = document.getElementById("lecturerInterface")
      if (lecturerInterface && lecturerInterface.classList.contains("active")) {
        attendanceSystem.startRealTimeUpdates()
        attendanceSystem.refreshData()
      }
    }
  }
})

// Handle online/offline status
window.addEventListener("online", () => {
  if (attendanceSystem) {
    attendanceSystem.showMessage("Connection restored", "success")
  }
})

window.addEventListener("offline", () => {
  if (attendanceSystem) {
    attendanceSystem.showMessage("Connection lost - working offline", "warning")
  }
})
