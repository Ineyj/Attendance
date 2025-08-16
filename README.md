# GCTU Smart Attendance System

A comprehensive attendance management system for Ghana Communication Technology University (GCTU) with user authentication and role-based access control.

## Features

### 🔐 Authentication System
- **Student Login/Registration**: Students can create accounts using their student ID and email
- **Lecturer Login/Registration**: Lecturers can register with GCTU email addresses
- **Secure Access**: Only authenticated users can access the attendance system
- **Role-based Interface**: Different interfaces for students and lecturers

### 📱 Student Features
- **Check-in System**: Mark attendance for courses with location verification
- **Pre-filled Information**: Student details automatically populated from profile
- **Course Selection**: Search and select from GCTU course database
- **Group Assignment**: Assign to specific study groups (A, B, C, D)
- **Location Verification**: Ensures students are on GCTU campus

### 👨‍🏫 Lecturer Features
- **Dashboard**: Real-time attendance monitoring
- **Statistics**: View attendance rates and student counts
- **Filtering**: Filter by course, group, and date
- **Export**: Download attendance data as CSV
- **Real-time Updates**: Live attendance tracking

### 🗄️ Data Management
- **Local Storage**: Secure data storage using browser localStorage
- **Mock Database**: Simulated Firebase-like database for demo purposes
- **Data Export**: CSV export functionality for record keeping

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection for initial loading

### Installation
1. Clone or download the project files
2. Open `index.htm` in your web browser
3. The system will automatically initialize

### First Time Setup
1. **Create Account**: Click "Sign up here" on the login page
2. **Choose Role**: Select either Student or Lecturer registration
3. **Fill Details**: Complete the registration form
4. **Login**: Use your credentials to access the system

## User Accounts

### Default Accounts (Demo)
- **Student**: GCTU001 / password123
- **Lecturer**: lecturer@gctu.edu.gh / gctu2024

### Student Registration
- Full Name
- Student ID (unique identifier)
- Email Address
- Password (minimum 6 characters)

### Lecturer Registration
- Full Name
- GCTU Email Address (must end with @gctu.edu.gh)
- Department Selection
- Password (minimum 6 characters)

## Usage

### For Students
1. **Login** with your student ID and password
2. **Select Course** from the dropdown or search
3. **Choose Group** (A, B, C, or D)
4. **Enter Lecturer** name and venue
5. **Verify Location** (must be on GCTU campus)
6. **Check In** to record attendance

### For Lecturers
1. **Login** with your GCTU email and password
2. **View Dashboard** with real-time statistics
3. **Filter Data** by course, group, or date
4. **Monitor Attendance** in the live table
5. **Export Data** as needed for record keeping

## Security Features

- **Password Protection**: All accounts require secure passwords
- **Role-based Access**: Students and lecturers have different permissions
- **Location Verification**: Prevents remote attendance marking
- **Session Management**: Automatic logout on page close
- **Data Validation**: Input validation and sanitization

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: Mock Firebase implementation with localStorage
- **Authentication**: Custom user management system
- **Responsive Design**: Mobile-friendly interface

### Data Storage
- **User Accounts**: Stored in localStorage under "userData"
- **Attendance Records**: Stored in localStorage under "attendanceData"
- **Session Data**: Current user information maintained in memory

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Customization

### Adding New Courses
Edit the `gctuCourses` array in `firebase-config.js`:
```javascript
const gctuCourses = [
  "Your New Course Name",
  // ... existing courses
]
```

### Modifying Departments
Update the department options in the lecturer signup form:
```html
<option value="Your Department">Your Department</option>
```

### Styling Changes
Modify the CSS variables in `styles.css`:
```css
:root {
  --primary-blue: #your-color;
  --primary-yellow: #your-color;
  /* ... other variables */
}
```

## Troubleshooting

### Common Issues
1. **Location Not Working**: Ensure location permissions are enabled
2. **Login Failed**: Check credentials and ensure account exists
3. **Form Not Submitting**: Verify all required fields are filled
4. **Data Not Loading**: Refresh the page and try again

### Browser Issues
- **Chrome**: May require HTTPS for location services
- **Firefox**: Check privacy settings for location access
- **Safari**: Ensure JavaScript is enabled

## Future Enhancements

- [ ] Real Firebase integration
- [ ] QR code attendance system
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Multi-campus support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is developed for GCTU and is intended for educational use.

## Support

For technical support or questions, please contact the development team or refer to the documentation above.

---

**GCTU Smart Attendance System** - Making attendance tracking smarter and more efficient.
