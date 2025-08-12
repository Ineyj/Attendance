class SmartAttendanceSystem {
  constructor() {
    this.currentLocation = null
    this.currentUser = null
    this.qrScanner = null
    this.sessionCodes = new Set()
    this.attendanceData = []
    this.isScanning = false
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
    this.setupEventListeners()
    this.startRealTimeClock()
    this.getCurrentLocation()
    this.loadAttendanceData()
    this.setupCourseSearch()

    // Hide loading screen after initialization
    setTimeout(() => {
      this.hideLoadingScreen()
      this.checkAuthenticationStatus()
    }, 3000)

    // Set today's date in filter
    document.getElementById("dateFilter").value = new Date().toISOString().split("T")[0]
  }

  showLoadingScreen() {
    document.getElementById("loadingScreen").style.display = "flex"
    document.getElementById("mainContainer").style.display = "none"
  }

  hideLoadingScreen() {
    document.getElementById("loadingScreen").style.display = "none"
    // Don't show main container immediately - let authentication decide
  }

  showAuthScreen() {
    document.getElementById("authContainer").style.display = "flex"
    document.getElementById("mainContainer").style.display = "none"
  }

  hideAuthScreen() {
    document.getElementById("authContainer").style.display = "none"
    document.getElementById("mainContainer").style.display = "block"
  }

  checkAuthenticationStatus() {
    const currentUser = localStorage.getItem("currentUser")
    if (currentUser) {
      this.currentUser = JSON.parse(currentUser)
      this.isAuthenticated = true
      this.hideAuthScreen()
      this.updateUserInterface()
    } else {
      this.showAuthScreen()
    }
  }

  updateUserInterface() {
    if (this.currentUser) {
      // Update student form with user data
      document.getElementById("studentName").value = this.currentUser.fullName
      document.getElementById("studentId").value = this.currentUser.studentId

      // Show welcome message
      this.showMessage(`Welcome back, ${this.currentUser.fullName}!`, "success")
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

  setupEventListeners() {
    // Role switcher
    document.getElementById("studentBtn").addEventListener("click", () => this.switchRole("student"))
    document.getElementById("lecturerBtn").addEventListener("click", () => this.switchRole("lecturer"))

    // Student form
    document.getElementById("studentForm").addEventListener("submit", (e) => this.handleCheckIn(e))

    // Authentication form
    document.getElementById("authForm").addEventListener("submit", (e) => this.handleAuthentication(e))

    // Student authentication forms
    document.getElementById("studentLoginForm").addEventListener("submit", (e) => this.handleStudentLogin(e))
    document.getElementById("studentSignupForm").addEventListener("submit", (e) => this.handleStudentSignup(e))

    // Auth form switchers
    document.getElementById("showSignupForm").addEventListener("click", (e) => {
      e.preventDefault()
      this.switchAuthForm("signup")
    })
    document.getElementById("showLoginForm").addEventListener("click", (e) => {
      e.preventDefault()
      this.switchAuthForm("login")
    })

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => this.handleLogout())

    // QR Scanner
    document.getElementById("scanQrBtn").addEventListener("click", () => this.startQRScanner())
    document.getElementById("stopScanBtn").addEventListener("click", () => this.stopQRScanner())

    // Lecturer controls
    document.getElementById("courseFilter").addEventListener("change", () => this.filterAttendance())
    document.getElementById("groupFilter").addEventListener("change", () => this.filterAttendance())
    document.getElementById("dateFilter").addEventListener("change", () => this.filterAttendance())
    document.getElementById("refreshBtn").addEventListener("click", () => this.refreshData())
    document.getElementById("exportBtn").addEventListener("click", () => this.exportToCSV())

    // QR Generator
    document.getElementById("generateQrBtn").addEventListener("click", () => this.generateQRCode())
    document.getElementById("downloadQrBtn").addEventListener("click", () => this.downloadQRCode())

    // Modal
    document.getElementById("modalClose").addEventListener("click", () => this.hideModal())
    document.getElementById("modalCancel").addEventListener("click", () => this.hideModal())
    document.getElementById("modalConfirm").addEventListener("click", () => this.confirmAction())

    // Form validation
    this.setupFormValidation()
  }

  setupCourseSearch() {
    const courseSearch = document.getElementById("courseSearch")
    const courseDropdown = document.getElementById("courseDropdown")
    const courseHidden = document.getElementById("course")

    courseSearch.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase()

      if (searchTerm.length < 2) {
        courseDropdown.classList.add("hidden")
        return
      }

      const filteredCourses = window.gctuCourses.filter((course) => course.toLowerCase().includes(searchTerm))

      if (filteredCourses.length > 0) {
        courseDropdown.innerHTML = filteredCourses
          .map((course) => `<div class="course-option" data-course="${course}">${course}</div>`)
          .join("")

        courseDropdown.classList.remove("hidden")

        // Add click listeners to options
        courseDropdown.querySelectorAll(".course-option").forEach((option) => {
          option.addEventListener("click", () => {
            const selectedCourse = option.dataset.course
            courseSearch.value = selectedCourse
            courseHidden.value = selectedCourse
            courseDropdown.classList.add("hidden")
            this.validateForm()
          })
        })
      } else {
        courseDropdown.classList.add("hidden")
      }
    })

    // Hide dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!courseSearch.contains(e.target) && !courseDropdown.contains(e.target)) {
        courseDropdown.classList.add("hidden")
      }
    })

    // Populate course filters for lecturer
    this.populateCourseFilters()
  }

  populateCourseFilters() {
    const courseFilter = document.getElementById("courseFilter")
    const qrCourse = document.getElementById("qrCourse")

    window.gctuCourses.forEach((course) => {
      const option1 = document.createElement("option")
      option1.value = course
      option1.textContent = course
      courseFilter.appendChild(option1)

      const option2 = document.createElement("option")
      option2.value = course
      option2.textContent = course
      qrCourse.appendChild(option2)
    })
  }

  setupFormValidation() {
    const inputs = document.querySelectorAll("#studentForm input, #studentForm select")
    inputs.forEach((input) => {
      input.addEventListener("input", () => this.validateForm())
      input.addEventListener("change", () => this.validateForm())
    })

    // Initial validation
    this.validateForm()
  }

  validateForm() {
    const name = document.getElementById("studentName").value.trim()
    const studentId = document.getElementById("studentId").value.trim()
    const course = document.getElementById("course").value
    const group = document.getElementById("group").value
    const lecturer = document.getElementById("lecturer").value.trim()
    const venue = document.getElementById("venue").value.trim()
    const hasLocation = this.currentLocation !== null

    const isValid = name && studentId && course && group && lecturer && venue && hasLocation
    const checkInBtn = document.getElementById("checkInBtn")

    // Enable/disable button
    checkInBtn.disabled = !isValid

    // Update button text and style based on validation
    if (!hasLocation) {
      checkInBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Verifying GCTU Campus Location...'
      checkInBtn.style.background = "linear-gradient(135deg, var(--warning) 0%, #d97706 100%)"
    } else if (!name || !studentId) {
      checkInBtn.innerHTML = '<i class="fas fa-user"></i> Enter Name & Student ID'
      checkInBtn.style.background = "linear-gradient(135deg, var(--gray-400) 0%, var(--gray-500) 100%)"
    } else if (!course) {
      checkInBtn.innerHTML = '<i class="fas fa-book"></i> Search & Select Course'
      checkInBtn.style.background = "linear-gradient(135deg, var(--warning) 0%, #d97706 100%)"
    } else if (!group) {
      checkInBtn.innerHTML = '<i class="fas fa-users"></i> Select Your Group'
      checkInBtn.style.background = "linear-gradient(135deg, var(--warning) 0%, #d97706 100%)"
    } else if (!lecturer) {
      checkInBtn.innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Enter Lecturer Name'
      checkInBtn.style.background = "linear-gradient(135deg, var(--warning) 0%, #d97706 100%)"
    } else if (!venue) {
      checkInBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Enter Class Venue'
      checkInBtn.style.background = "linear-gradient(135deg, var(--warning) 0%, #d97706 100%)"
    } else if (isValid) {
      checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check In to Class'
      checkInBtn.style.background = "linear-gradient(135deg, var(--success) 0%, #059669 100%)"
    }

    return isValid
  }

  switchRole(role) {
    // Update button states
    document.querySelectorAll(".role-btn").forEach((btn) => btn.classList.remove("active"))
    document.getElementById(role + "Btn").classList.add("active")

    // Show/hide sections
    document.querySelectorAll(".interface").forEach((element) => element.classList.remove("active"))

    if (role === "lecturer") {
      if (this.isAuthenticated) {
        document.getElementById("lecturerInterface").classList.add("active")
        this.loadAttendanceData()
        this.startRealTimeUpdates()
      } else {
        document.getElementById("lecturerAuth").classList.add("active")
      }
    } else {
      document.getElementById("studentInterface").classList.add("active")
      this.stopRealTimeUpdates()
    }

    this.showMessage(`Switched to ${role} mode`, "success")
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

  handleLogout() {
    this.isAuthenticated = false
    this.currentUser = null
    this.stopRealTimeUpdates()

    document.getElementById("lecturerInterface").classList.remove("active")
    document.getElementById("lecturerAuth").classList.add("active")

    // Clear form
    document.getElementById("authForm").reset()

    this.showMessage("Logged out successfully.", "success")
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

    // Prevent double submission
    if (this.isSubmitting) {
      return
    }

    if (!this.currentLocation) {
      this.showMessage("❌ Location not available. Please refresh and try again.", "error")
      return
    }

    // Validate form one more time
    if (!this.validateForm()) {
      this.showMessage("❌ Please complete all required fields before checking in.", "error")
      return
    }

    const checkInBtn = document.getElementById("checkInBtn")
    const btnLoading = checkInBtn.querySelector(".btn-loading")

    // Set submitting state
    this.isSubmitting = true

    // Show loading state
    checkInBtn.disabled = true
    btnLoading.classList.remove("hidden")
    checkInBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Checking In... <div class="btn-loading"><i class="fas fa-spinner fa-spin"></i></div>'

    const formData = {
      name: document.getElementById("studentName").value.trim(),
      studentId: document.getElementById("studentId").value.trim(),
      course: document.getElementById("course").value,
      group: document.getElementById("group").value,
      lecturer: document.getElementById("lecturer").value.trim(),
      venue: document.getElementById("venue").value.trim(),
      qrCode: document.getElementById("qrInput").value.trim() || null,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
      location: this.currentLocation,
    }

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
      // Show progress message
      this.showMessage("📍 Processing your check-in...", "warning")

      // Save to database with timeout
      const savePromise = window.database.ref("attendance").push(formData)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 10000))

      await Promise.race([savePromise, timeoutPromise])

      // Track check-in to prevent duplicates
      existingCheckIns.push(duplicateKey)
      localStorage.setItem("checkInKeys", JSON.stringify(existingCheckIns))

      // Success feedback
      this.showMessage(`✅ Check-in successful for ${formData.course} - Group ${formData.group}!`, "success")

      // Reset form
      document.getElementById("studentForm").reset()
      document.getElementById("course").value = ""
      document.getElementById("courseSearch").value = ""

      // Show success state briefly
      checkInBtn.innerHTML = '<i class="fas fa-check-circle"></i> Check-In Successful!'
      checkInBtn.style.background = "linear-gradient(135deg, var(--success) 0%, #059669 100%)"

      // Reset after 2 seconds
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

  startQRScanner() {
    if (this.isScanning) return

    const qrScannerDiv = document.getElementById("qrScanner")
    qrScannerDiv.classList.remove("hidden")
    this.isScanning = true

    // Check if QR library is available
    if (typeof Html5Qrcode === "undefined") {
      this.showMessage("❌ QR Scanner library not loaded. Please refresh the page.", "error")
      this.stopQRScanner()
      return
    }

    try {
      this.qrScanner = new Html5Qrcode("qrReader")

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      }

      // Get all available cameras
      Html5Qrcode.getCameras()
        .then((cameras) => {
          if (cameras && cameras.length) {
            console.log("Available cameras:", cameras)

            // Find back camera (environment) and front camera (user)
            const backCamera = cameras.find(
              (camera) =>
                camera.label.toLowerCase().includes("back") ||
                camera.label.toLowerCase().includes("rear") ||
                camera.label.toLowerCase().includes("environment"),
            )

            const frontCamera = cameras.find(
              (camera) =>
                camera.label.toLowerCase().includes("front") ||
                camera.label.toLowerCase().includes("user") ||
                camera.label.toLowerCase().includes("facing"),
            )

            // Prefer back camera for QR scanning, fallback to front, then first available
            const selectedCamera = backCamera || frontCamera || cameras[0]

            console.log("Selected camera:", selectedCamera)
            this.showMessage(`📷 Starting camera: ${selectedCamera.label || "Camera"}`, "success")

            // Add camera switch button if multiple cameras available
            if (cameras.length > 1) {
              this.addCameraSwitchButton(cameras)
            }

            this.startCameraWithId(selectedCamera.id, config)
          } else {
            this.showMessage("❌ No cameras found on this device.", "error")
            this.stopQRScanner()
          }
        })
        .catch((err) => {
          console.error("Camera detection error:", err)
          this.showMessage("❌ Camera access denied or not available.", "error")
          this.stopQRScanner()
        })
    } catch (error) {
      console.error("QR Scanner initialization error:", error)
      this.showMessage("❌ QR Scanner failed to initialize.", "error")
      this.stopQRScanner()
    }
  }

  addCameraSwitchButton(cameras) {
    const scannerHeader = document.querySelector(".scanner-header")

    // Remove existing switch button if any
    const existingBtn = scannerHeader.querySelector(".camera-switch-btn")
    if (existingBtn) {
      existingBtn.remove()
    }

    const switchBtn = document.createElement("button")
    switchBtn.className = "camera-switch-btn"
    switchBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Switch Camera'
    switchBtn.style.cssText = `
      background: var(--primary-blue);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 5px;
    `

    let currentCameraIndex = 0

    switchBtn.addEventListener("click", () => {
      currentCameraIndex = (currentCameraIndex + 1) % cameras.length
      const newCamera = cameras[currentCameraIndex]

      this.showMessage(`📷 Switching to: ${newCamera.label || `Camera ${currentCameraIndex + 1}`}`, "warning")

      // Stop current camera and start new one
      if (this.qrScanner) {
        this.qrScanner
          .stop()
          .then(() => {
            const config = {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              showTorchButtonIfSupported: true,
              showZoomSliderIfSupported: true,
              defaultZoomValueIfSupported: 2,
            }
            this.startCameraWithId(newCamera.id, config)
          })
          .catch((err) => {
            console.error("Error switching camera:", err)
            this.showMessage("❌ Failed to switch camera", "error")
          })
      }
    })

    scannerHeader.insertBefore(switchBtn, scannerHeader.lastElementChild)
  }

  startCameraWithId(cameraId, config) {
    this.qrScanner
      .start(
        cameraId,
        config,
        (decodedText, decodedResult) => {
          console.log("QR Code scanned:", decodedText)
          document.getElementById("qrInput").value = decodedText
          this.stopQRScanner()
          this.showMessage("✅ QR Code scanned successfully!", "success")
          this.validateForm()
        },
        (errorMessage) => {
          // Handle scan errors silently - this fires frequently during scanning
        },
      )
      .catch((err) => {
        console.error("QR Scanner start error:", err)
        this.showMessage("❌ Failed to start camera. Please check permissions.", "error")
        this.stopQRScanner()
      })
  }

  stopQRScanner() {
    if (this.qrScanner && this.isScanning) {
      this.qrScanner
        .stop()
        .then(() => {
          this.qrScanner.clear()
          this.qrScanner = null
          console.log("QR Scanner stopped successfully")
        })
        .catch((err) => {
          console.error("Error stopping scanner:", err)
        })
    }

    // Remove camera switch button
    const switchBtn = document.querySelector(".camera-switch-btn")
    if (switchBtn) {
      switchBtn.remove()
    }

    document.getElementById("qrScanner").classList.add("hidden")
    this.isScanning = false
  }

  generateQRCode() {
    const course = document.getElementById("qrCourse").value
    if (!course) {
      this.showMessage("Please select a course", "error")
      return
    }

    // Generate session code with timestamp for uniqueness
    const timestamp = Date.now()
    const sessionCode = `GCTU-${course.replace(/\s+/g, "")}-${timestamp}`
    this.sessionCodes.add(sessionCode)

    const canvas = document.getElementById("qrCanvas")

    if (typeof QRCode !== "undefined") {
      QRCode.toCanvas(
        canvas,
        sessionCode,
        {
          width: 200,
          height: 200,
          colorDark: "#1e40af",
          colorLight: "#ffffff",
          margin: 2,
          errorCorrectionLevel: "M",
        },
        (error) => {
          if (error) {
            this.showMessage("Failed to generate QR code", "error")
            console.error(error)
          } else {
            document.getElementById("sessionCode").textContent = sessionCode
            document.getElementById("qrTimestamp").textContent = new Date().toLocaleString()
            document.getElementById("qrCodeDisplay").classList.remove("hidden")
            this.showMessage("QR Code generated successfully!", "success")
            this.updateStats(this.attendanceData)
          }
        },
      )
    } else {
      this.showMessage("QR Code library not loaded. Please refresh the page.", "error")
    }
  }

  downloadQRCode() {
    const canvas = document.getElementById("qrCanvas")
    const sessionCode = document.getElementById("sessionCode").textContent

    if (canvas && sessionCode) {
      const link = document.createElement("a")
      link.download = `GCTU_QR_${sessionCode}.png`
      link.href = canvas.toDataURL()
      link.click()
      this.showMessage("QR Code downloaded successfully!", "success")
    }
  }

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
    document.getElementById("activeCount").textContent = this.sessionCodes.size
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
          `"${record.qrCode || "N/A"}"`,
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
        ${record.qrCode ? `<p><strong>QR Code:</strong> ${record.qrCode}</p>` : ""}
      </div>
    `,
    )
  }

  editRecord(recordId) {
    const record = this.attendanceData.find((r) => r.id === recordId)
    if (!record) return

    this.showModal(
      "Edit Attendance Record",
      `
      <div style="text-align: left;">
        <p><strong>Student:</strong> ${record.name} (${record.studentId})</p>
        <p><strong>Course:</strong> ${record.course}</p>
        <p><strong>Current Status:</strong> Present</p>
        <br>
        <p>Are you sure you want to edit this attendance record?</p>
      </div>
    `,
      () => {
        this.showMessage("Edit functionality would be implemented here", "warning")
      },
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
