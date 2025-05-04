document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const container = document.querySelector('.container');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const imageSlider = document.querySelector('.image-slider');

    // Form switching functionality
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.add('show-register');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        container.classList.remove('show-register');
    });

    // Form submission handling
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store the token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userFirstName', data.user.firstName);
            localStorage.setItem('userEmail', data.user.email);

            // Redirect to homepage after successful login
            window.location.href = 'homepage.html';
        } catch (error) {
            console.error('Login error:', error);
            alert(error.message || 'Login failed. Please try again.');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = registerForm.querySelector('input[placeholder="First Name"]').value;
        const lastName = registerForm.querySelector('input[placeholder="Last Name"]').value;
        const email = registerForm.querySelector('input[type="email"]').value;
        const mobile = registerForm.querySelector('input[type="tel"]').value;
        const address = registerForm.querySelector('input[placeholder="Address"]').value;
        const password = registerForm.querySelector('input[type="password"]').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    mobile,
                    address,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store the token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userFirstName', data.user.firstName);
            localStorage.setItem('userEmail', data.user.email);

            alert('Registration successful!');
            window.location.href = 'homepage.html';
        } catch (error) {
            console.error('Registration error:', error);
            alert(error.message || 'Registration failed. Please try again.');
        }
    });

    // Image slider functionality
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;

    function showSlide(index) {
        const offset = index * -100;
        imageSlider.style.transform = `translateX(${offset}%)`;
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }

    // Auto-advance slides every 5 seconds
    setInterval(nextSlide, 5000);

    // Add smooth transition to slider
    imageSlider.style.transition = 'transform 0.5s ease-in-out';
    imageSlider.style.display = 'flex';
    imageSlider.style.width = `${totalSlides * 100}%`;

    // Make slides equal width
    slides.forEach(slide => {
        slide.style.width = `${100 / totalSlides}%`;
    });
});