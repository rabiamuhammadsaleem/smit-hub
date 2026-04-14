import { supabase } from './supabase.js'

export let currentUser = null

export function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingAlerts = document.querySelectorAll('.alert-notify')
    existingAlerts.forEach(alert => alert.remove())
    
    const alertDiv = document.createElement('div')
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-notify`
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 280px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `
    alertDiv.innerHTML = `<strong>${type === 'success' ? '✅' : '❌'}</strong> ${message}<button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>`
    document.body.appendChild(alertDiv)
    
    setTimeout(() => {
        if (alertDiv && alertDiv.remove) alertDiv.remove()
    }, 3000)
}

export function formatDate(date) {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString()
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    return user
}

export async function logout() {
    await supabase.auth.signOut()
    window.location.href = 'index.html'
}