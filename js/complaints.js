import { supabase } from './supabase.js'
import { getCurrentUser, formatDate } from './common.js'

let currentUser = null

async function initComplaints() {
    currentUser = await getCurrentUser()
    if (!currentUser) {
        window.location.href = 'index.html'
        return
    }
    await loadMyComplaints()
    
    document.getElementById('complaintForm')?.addEventListener('submit', submitComplaint)
    document.getElementById('logoutBtn')?.addEventListener('click', () => { supabase.auth.signOut(); window.location.href = 'index.html' })
}

async function loadMyComplaints() {
    const { data } = await supabase.from('complaints').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false })
    document.getElementById('complaintCount').innerText = data?.length || 0
    
    if (!data?.length) {
        document.getElementById('complaintsList').innerHTML = '<div class="col-12"><div class="alert alert-info">No complaints yet. Click "Submit Complaint" to add.</div></div>'
        return
    }
    
    let html = ''
    for (let c of data) {
        let statusClass = c.status === 'Submitted' ? 'status-submitted' : (c.status === 'In Progress' ? 'status-inprogress' : 'status-resolved')
        html += `<div class="col-md-6 col-sm-12 mb-3">
            <div class="card card-smit p-3">
                <div class="d-flex justify-content-between flex-wrap">
                    <h5>📌 ${c.category}</h5>
                    <span class="${statusClass}">${c.status}</span>
                </div>
                <p class="text-muted small">${formatDate(c.created_at)}</p>
                <p>${c.description}</p>
            </div>
        </div>`
    }
    document.getElementById('complaintsList').innerHTML = html
}

async function submitComplaint(e) {
    e.preventDefault()
    await supabase.from('complaints').insert([{ user_id: currentUser.id, category: document.getElementById('category').value, description: document.getElementById('description').value, status: 'Submitted' }])
    alert('✅ Complaint submitted!')
    document.getElementById('complaintForm').reset()
    bootstrap.Modal.getInstance(document.getElementById('complaintModal')).hide()
    await loadMyComplaints()
}

initComplaints()