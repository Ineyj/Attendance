// Firebase configuration
const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
}

// Enhanced Mock Firebase for demo purposes with User Authentication
class MockFirebase {
  constructor() {
    this.data = JSON.parse(localStorage.getItem("attendanceData") || "{}")
    this.users = JSON.parse(localStorage.getItem("userData") || "{}")
    this.listeners = new Map()
    this.isConnected = true
    this.currentUser = null

    // Initialize default users if none exist
    this.initializeDefaultUsers()

    // Simulate connection status
    this.simulateConnection()
  }

  initializeDefaultUsers() {
    if (!this.users.students || !this.users.lecturers) {
      this.users = {
        students: {
          "GCTU001": {
            id: "GCTU001",
            name: "Kwame Asante",
            email: "kwame.asante@student.gctu.edu.gh",
            password: "password123", // In real app, this would be hashed
            role: "student",
            department: "Computer Science",
            createdAt: new Date().toISOString()
          },
          "GCTU002": {
            id: "GCTU002",
            name: "Akosua Mensah",
            email: "akosua.mensah@student.gctu.edu.gh",
            password: "password123",
            role: "student",
            department: "Information Technology",
            createdAt: new Date().toISOString()
          }
        },
        lecturers: {
          "lecturer@gctu.edu.gh": {
            id: "lecturer@gctu.edu.gh",
            name: "Dr. John Doe",
            email: "lecturer@gctu.edu.gh",
            password: "gctu2024",
            role: "lecturer",
            department: "Computer Science",
            createdAt: new Date().toISOString()
          }
        }
      }
      localStorage.setItem("userData", JSON.stringify(this.users))
    }
  }

  // User Authentication Methods
  async signUp(userData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error("Network error"))
        return
      }

      setTimeout(() => {
        try {
          const { email, studentId, role, password, name, department } = userData
          
          // Check if user already exists
          if (role === "student") {
            if (this.users.students[studentId]) {
              reject(new Error("Student ID already exists"))
              return
            }
            if (this.users.students[email]) {
              reject(new Error("Email already exists"))
              return
            }
          } else {
            if (this.users.lecturers[email]) {
              reject(new Error("Email already exists"))
              return
            }
          }

          // Create new user
          const newUser = {
            id: role === "student" ? studentId : email,
            name,
            email,
            password, // In real app, hash this password
            role,
            department,
            createdAt: new Date().toISOString()
          }

          if (role === "student") {
            this.users.students[studentId] = newUser
            this.users.students[email] = newUser
          } else {
            this.users.lecturers[email] = newUser
          }

          localStorage.setItem("userData", JSON.stringify(this.users))
          resolve({ user: newUser })
        } catch (error) {
          reject(error)
        }
      }, 500)
    })
  }

  async signIn(credentials) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error("Network error"))
        return
      }

      setTimeout(() => {
        try {
          const { email, studentId, password, role } = credentials
          let user = null

          if (role === "student") {
            // Check student login by ID or email
            user = this.users.students[studentId] || this.users.students[email]
          } else {
            // Check lecturer login by email
            user = this.users.lecturers[email]
          }

          if (!user || user.password !== password) {
            reject(new Error("Invalid credentials"))
            return
          }

          // Set current user
          this.currentUser = user
          resolve({ user })
        } catch (error) {
          reject(error)
        }
      }, 500)
    })
  }

  async signOut() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null
        resolve()
      }, 200)
    })
  }

  getCurrentUser() {
    return this.currentUser
  }

  isAuthenticated() {
    return !!this.currentUser
  }

  simulateConnection() {
    setInterval(() => {
      // Randomly simulate connection issues (very rarely)
      if (Math.random() < 0.001) {
        this.isConnected = false
        setTimeout(() => {
          this.isConnected = true
        }, 2000)
      }
    }, 1000)
  }

  ref(path) {
    return {
      push: (data) => {
        return new Promise((resolve, reject) => {
          if (!this.isConnected) {
            reject(new Error("Network error"))
            return
          }

          setTimeout(() => {
            const key = Date.now().toString() + Math.random().toString(36).substr(2, 9)
            if (!this.data[path]) this.data[path] = {}
            this.data[path][key] = { ...data, id: key }
            localStorage.setItem("attendanceData", JSON.stringify(this.data))

            // Notify listeners
            this.notifyListeners(path)

            resolve({ key })
          }, 500) // Simulate network delay
        })
      },

      on: (event, callback) => {
        if (!this.listeners.has(path)) {
          this.listeners.set(path, [])
        }
        this.listeners.get(path).push(callback)

        // Initial call
        callback({ val: () => this.data[path] || {} })
      },

      once: (event) => {
        return Promise.resolve({ val: () => this.data[path] || {} })
      },

      remove: (key) => {
        return new Promise((resolve) => {
          if (this.data[path] && this.data[path][key]) {
            delete this.data[path][key]
            localStorage.setItem("attendanceData", JSON.stringify(this.data))
            this.notifyListeners(path)
          }
          resolve()
        })
      },
    }
  }

  notifyListeners(path) {
    if (this.listeners.has(path)) {
      this.listeners.get(path).forEach((callback) => {
        callback({ val: () => this.data[path] || {} })
      })
    }
  }
}

// Initialize mock database
window.database = new MockFirebase()

// GCTU Courses Database
const gctuCourses = [
  "Computer Science 101 - Introduction to Programming",
  "Computer Science 201 - Data Structures and Algorithms",
  "Computer Science 301 - Database Management Systems",
  "Computer Science 401 - Software Engineering",
  "Information Technology 101 - IT Fundamentals",
  "Information Technology 201 - Network Administration",
  "Information Technology 301 - Cybersecurity",
  "Information Technology 401 - Cloud Computing",
  "Telecommunications 101 - Communication Principles",
  "Telecommunications 201 - Digital Signal Processing",
  "Telecommunications 301 - Wireless Networks",
  "Telecommunications 401 - Network Security",
  "Business Administration 101 - Principles of Management",
  "Business Administration 201 - Marketing Management",
  "Business Administration 301 - Financial Management",
  "Business Administration 401 - Strategic Management",
  "Mathematics 101 - Calculus I",
  "Mathematics 201 - Statistics and Probability",
  "Mathematics 301 - Linear Algebra",
  "Physics 101 - General Physics",
  "Physics 201 - Electronics",
  "English 101 - Communication Skills",
  "English 201 - Technical Writing",
]

// Store courses globally
window.gctuCourses = gctuCourses

// Add some sample data for demo with GCTU-specific information
const sampleData = {
  attendance: {
    sample1: {
      id: "sample1",
      name: "Kwame Asante",
      studentId: "GCTU001",
      course: "Computer Science 101 - Introduction to Programming",
      group: "A",
      lecturer: "Dr. Emmanuel Osei",
      venue: "Computer Lab 1",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      date: new Date().toISOString().split("T")[0],
      location: { latitude: 5.6037, longitude: -0.187, accuracy: 10 },
      qrCode: "CS101-A-1234567890",
    },
    sample2: {
      id: "sample2",
      name: "Akosua Mensah",
      studentId: "GCTU002",
      course: "Information Technology 201 - Network Administration",
      group: "B",
      lecturer: "Prof. Yaw Boateng",
      venue: "Network Lab",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      date: new Date().toISOString().split("T")[0],
      location: { latitude: 5.6035, longitude: -0.1872, accuracy: 8 },
      qrCode: "IT201-B-0987654321",
    },
    sample3: {
      id: "sample3",
      name: "Kofi Adjei",
      studentId: "GCTU003",
      course: "Telecommunications 301 - Wireless Networks",
      group: "C",
      lecturer: "Dr. Ama Serwaa",
      venue: "Lecture Hall A",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      date: new Date().toISOString().split("T")[0],
      location: { latitude: 5.604, longitude: -0.1868, accuracy: 12 },
      qrCode: "TEL301-C-1122334455",
    },
    sample4: {
      id: "sample4",
      name: "Efua Darko",
      studentId: "GCTU004",
      course: "Business Administration 201 - Marketing Management",
      group: "D",
      lecturer: "Mr. Samuel Nkrumah",
      venue: "Business Block Room 201",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      date: new Date().toISOString().split("T")[0],
      location: { latitude: 5.6038, longitude: -0.1875, accuracy: 8 },
      qrCode: "BA201-D-5566778899",
    },
  },
}

// Add sample data if none exists
if (!localStorage.getItem("attendanceData")) {
  localStorage.setItem("attendanceData", JSON.stringify(sampleData))
  window.database.data = sampleData
}
