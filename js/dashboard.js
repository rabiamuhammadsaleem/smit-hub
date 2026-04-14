import { supabase } from './supabase.js'
import { getCurrentUser, logout, showNotification } from './common.js'

async function loadDashboard() {
    const user = await getCurrentUser()
    if (!user) {
        window.location.href = 'index.html'
        return
    }
    document.getElementById('userEmail').innerHTML = user.email.split('@')[0]
}

// Logout button handler
const logoutBtn = document.getElementById('logoutBtn')
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut()
        showNotification('Logged out successfully')
        window.location.href = 'index.html'
    })
}

loadDashboard()