import { supabase } from './supabase.js'
import { showNotification } from './common.js'

// Track login activity
async function trackLogin(userId, email) {
    try {
        await supabase.from('login_activity').insert([{
            user_id: userId,
            user_email: email,
            login_time: new Date()
        }])
    } catch(e) { 
        console.log('Track error:', e) 
    }
}

// Signup function
export async function signup(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password 
        })
        
        if (error) throw error
        
        showNotification('Account created! Please login.', 'success')
        return true
    } catch (error) {
        showNotification(error.message, 'error')
        return false
    }
}

// Login function
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
        })
        
        if (error) throw error
        
        await trackLogin(data.user.id, data.user.email)
        showNotification('Login successful!', 'success')
        return true
    } catch (error) {
        showNotification(error.message, 'error')
        return false
    }
}

// Check if user is logged in
export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html'
        return false
    }
    return user
}

// Initialize auth page (for index.html)
export async function initAuthPage() {
    // Signup form handler
    const signupForm = document.getElementById('signupForm')
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = document.getElementById('signupEmail').value
            const password = document.getElementById('signupPassword').value
            const confirm = document.getElementById('signupConfirm').value
            
            if (password !== confirm) {
                showNotification('Passwords do not match!', 'error')
                return
            }
            if (password.length < 6) {
                showNotification('Password must be at least 6 characters', 'error')
                return
            }
            
            const success = await signup(email, password)
            if (success) {
                document.getElementById('signupForm').reset()
                // Switch to login tab
                const loginTabBtn = document.querySelector('[data-bs-target="#loginTab"]')
                if (loginTabBtn) loginTabBtn.click()
            }
        })
    }
    
    // Login form handler
    const loginForm = document.getElementById('loginForm')
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = document.getElementById('loginEmail').value
            const password = document.getElementById('loginPassword').value
            
            const success = await login(email, password)
            if (success) {
                setTimeout(() => {
                    window.location.href = 'dashboard.html'
                }, 1000)
            }
        })
    }
}

// Run init when page loads
if (document.getElementById('loginForm') || document.getElementById('signupForm')) {
    initAuthPage()
}