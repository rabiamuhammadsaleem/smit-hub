import { supabase } from './supabase.js'
import { getCurrentUser, formatDate } from './common.js'

let currentUser = null

async function initVolunteer() {
    currentUser = await getCurrentUser()
    if (!currentUser) {
        window.location.href = 'index.html'
        return
    }
    await loadMyVolunteers()
    
    document.getElementById('volunteerForm')?.addEventListener('submit', submitVolunteer)
    document.getElementById('logoutBtn')?.addEventListener('click', () => { supabase.auth.signOut(); window.location.href = 'index.html' })
}

async function loadMyVolunteers() {
    const { data } = await supabase.from('volunteers').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
    document.getElementById('volunteerCount').innerText = data?.length || 0
    
    if (!data?.length) {
        document.getElementById('volunteerList').innerHTML = '<div class="col-12"><div class="alert alert-info">No registrations yet. Click "Register Now" to volunteer.</div></div>'
        return
    }
    
    let html = ''
    for (let v of data) {
        html += `<div class="col-md-6 col-sm-12 mb-3">
            <div class="card card-smit p-3">
                <h5>🎯 ${v.event}</h5>
                <p><strong>Name:</strong> ${v.name}<br><strong>Availability:</strong> ${v.availability}</p>
                <p class="text-muted small">${formatDate(v.created_at)}</p>
            </div>
        </div>`
    }
    document.getElementById('volunteerList').innerHTML = html
}

async function submitVolunteer(e) {
    e.preventDefault()
    await supabase.from('volunteers').insert([{ user_id: currentUser.id, name: document.getElementById('name').value, event: document.getElementById('event').value, availability: document.getElementById('availability').value }])
    alert('✅ Registered as volunteer!')
    document.getElementById('volunteerForm').reset()
    bootstrap.Modal.getInstance(document.getElementById('volunteerModal')).hide()
    await loadMyVolunteers()
}

initVolunteer()