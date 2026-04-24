import { supabase } from './supabase.js'
import { showNotification } from './common.js'

let currentUser = null
const ADMIN_EMAILS = ['admin@gmail.com', 'rabia@gmail.com']

async function initAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { 
        window.location.href = 'index.html'
        return 
    }
    currentUser = user
    
    if (!ADMIN_EMAILS.includes(user.email)) {
        document.body.innerHTML = `<div class="container mt-5"><div class="alert alert-danger text-center"><h3>⛔ Access Denied</h3><p>Redirecting...</p></div></div>`
        setTimeout(() => window.location.href = 'dashboard.html', 3000)
        return
    }
    
    await loadAllData()
    
    const logoutBtn = document.getElementById('logoutBtn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut()
            window.location.href = 'index.html'
        })
    }
}

async function loadAllData() {
    await loadLostFound()
    await loadComplaints()
    await loadVolunteers()
    await loadClaims()
    await updateStats()
}

// ========== LOST & FOUND ==========
async function loadLostFound() {
    const { data } = await supabase
        .from('lost_found_items')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (!data?.length) {
        document.getElementById('lostFoundTable').innerHTML = '<tr><td colspan="7" class="text-center">No data found</td></tr>'
        return
    }
    
    let html = ''
    let serialNo = 1
    for (let item of data) {
        html += `
            <tr>
                <td style="width:50px; text-align:center;">${serialNo++}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(item.description || '')}">${escapeHtml(item.description?.substring(0,40) || '-')}</td>
                <td style="width:130px;">
                    <select class="form-select form-select-sm status-lost" data-id="${item.id}" style="width:100px">
                        <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="found" ${item.status === 'found' ? 'selected' : ''}>Found</option>
                    </select>
                </td>
                <td style="width:80px;">${item.user_id?.substring(0,8)}...</td>
                <td style="white-space:nowrap; width:100px;">${new Date(item.created_at).toLocaleDateString()}</td>
                <td style="width:80px;">
                    <button class="btn btn-danger btn-sm delete-item" data-id="${item.id}" data-table="lost_found_items">🗑️ Delete</button>
                </td>
            </tr>
        `
    }
    document.getElementById('lostFoundTable').innerHTML = html
    
    document.querySelectorAll('.status-lost').forEach(sel => {
        sel.removeEventListener('change', handleLostStatusChange)
        sel.addEventListener('change', handleLostStatusChange)
    })
    
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.removeEventListener('click', handleDelete)
        btn.addEventListener('click', handleDelete)
    })
}

async function handleLostStatusChange(e) {
    const select = e.target
    const newStatus = select.value
    const itemId = select.dataset.id
    const { error } = await supabase
        .from('lost_found_items')
        .update({ status: newStatus })
        .eq('id', itemId)
    if (error) {
        showNotification('Error: ' + error.message, 'error')
    } else {
        showNotification('✅ Status updated to ' + newStatus, 'success')
        await loadAllData()
    }
}

// ========== COMPLAINTS ==========
async function loadComplaints() {
    const { data } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (!data?.length) {
        document.getElementById('complaintsTable').innerHTML = '<tr><td colspan="7" class="text-center">No data found</td></tr>'
        return
    }
    
    let html = ''
    let serialNo = 1
    for (let c of data) {
        html += `
            <tr>
                <td style="width:50px; text-align:center;">${serialNo++}</td>
                <td style="width:120px;">${escapeHtml(c.category)}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(c.description || '')}">${escapeHtml(c.description?.substring(0,40) || '-')}</td>
                <td style="width:130px;">
                    <select class="form-select form-select-sm status-complaint" data-id="${c.id}" style="width:120px">
                        <option value="submitted" ${c.status === 'submitted' ? 'selected' : ''}>Submitted</option>
                        <option value="in_progress" ${c.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </td>
                <td style="width:80px;">${c.user_id?.substring(0,8)}...</td>
                <td style="white-space:nowrap; width:100px;">${new Date(c.created_at).toLocaleDateString()}</td>
                <td style="width:80px;">
                    <button class="btn btn-danger btn-sm delete-complaint" data-id="${c.id}" data-table="complaints">🗑️ Delete</button>
                </td>
            </tr>
        `
    }
    document.getElementById('complaintsTable').innerHTML = html
    
    document.querySelectorAll('.status-complaint').forEach(sel => {
        sel.removeEventListener('change', handleComplaintStatusChange)
        sel.addEventListener('change', handleComplaintStatusChange)
    })
    
    document.querySelectorAll('.delete-complaint').forEach(btn => {
        btn.removeEventListener('click', handleDelete)
        btn.addEventListener('click', handleDelete)
    })
}

async function handleComplaintStatusChange(e) {
    const select = e.target
    const newStatus = select.value
    const itemId = select.dataset.id
    const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', itemId)
    if (error) {
        showNotification('Error: ' + error.message, 'error')
    } else {
        showNotification('✅ Status updated to ' + newStatus, 'success')
        await loadAllData()
    }
}

// ========== VOLUNTEERS ==========
async function loadVolunteers() {
    const { data } = await supabase
        .from('volunteers')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (!data?.length) {
        document.getElementById('volunteersTable').innerHTML = '<tr><td colspan="8" class="text-center">No data found</td></tr>'
        return
    }
    
    let html = ''
    let serialNo = 1
    for (let v of data) {
        html += `
            <tr>
                <td style="width:50px; text-align:center;">${serialNo++}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(v.full_name || v.name)}">${escapeHtml(v.full_name || v.name)}</td>
                <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(v.event)}</td>
                <td style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(v.availability)}</td>
                <td style="width:130px;">
                    <select class="form-select form-select-sm status-volunteer" data-id="${v.id}" style="width:110px">
                        <option value="pending" ${v.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                        <option value="approved" ${v.status === 'approved' ? 'selected' : ''}>✅ Approved</option>
                        <option value="rejected" ${v.status === 'rejected' ? 'selected' : ''}>❌ Rejected</option>
                    </select>
                </td>
                <td style="width:80px;">${v.user_id?.substring(0,8)}...</td>
                <td style="white-space:nowrap; width:100px;">${new Date(v.created_at).toLocaleDateString()}</td>
                <td style="width:80px;">
                    <button class="btn btn-danger btn-sm delete-volunteer" data-id="${v.id}" data-table="volunteers">🗑️ Delete</button>
                </td>
            </tr>
        `
    }
    document.getElementById('volunteersTable').innerHTML = html
    
    document.querySelectorAll('.status-volunteer').forEach(sel => {
        sel.removeEventListener('change', handleVolunteerStatusChange)
        sel.addEventListener('change', handleVolunteerStatusChange)
    })
    
    document.querySelectorAll('.delete-volunteer').forEach(btn => {
        btn.removeEventListener('click', handleDelete)
        btn.addEventListener('click', handleDelete)
    })
}

async function handleVolunteerStatusChange(e) {
    const select = e.target
    const newStatus = select.value
    const itemId = select.dataset.id
    const { error } = await supabase
        .from('volunteers')
        .update({ status: newStatus })
        .eq('id', itemId)
    if (error) {
        showNotification('Error: ' + error.message, 'error')
    } else {
        showNotification('✅ Volunteer status updated to ' + newStatus, 'success')
        await loadAllData()
    }
}

// ========== CLAIMS (RAISED HAND) ==========
async function loadClaims() {
    const { data: claims } = await supabase
        .from('item_claims')
        .select('*')
        .order('created_at', { ascending: false })
    
    const { data: items } = await supabase
        .from('lost_found_items')
        .select('id, title')
    
    if (!claims?.length) {
        document.getElementById('claimsTable').innerHTML = '<tr><td colspan="8" class="text-center">No raised hand claims yet</td></tr>'
        document.getElementById('claimCount').innerText = '0'
        return
    }
    
    const itemMap = {}
    items?.forEach(item => { itemMap[item.id] = item.title })
    
    let html = ''
    let serialNo = 1
    for (let claim of claims) {
        html += `
            <tr>
                <td style="width:50px; text-align:center;">${serialNo++}</td>
                <td>${escapeHtml(itemMap[claim.item_id] || 'Item ' + claim.item_id)}</td>
                <td>${escapeHtml(claim.claimant_name)}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(claim.claimant_email)}</td>
                <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(claim.message || '')}">${escapeHtml(claim.message?.substring(0,30) || '-')}</td>
                <td style="width:130px;">
                    <select class="form-select form-select-sm status-claim" data-id="${claim.id}" style="width:100px">
                        <option value="pending" ${claim.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="approved" ${claim.status === 'approved' ? 'selected' : ''}>Approved</option>
                        <option value="rejected" ${claim.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
                <td style="white-space:nowrap; width:150px;">${new Date(claim.created_at).toLocaleString()}</td>
                <td style="width:80px;">
                    <button class="btn btn-danger btn-sm delete-claim" data-id="${claim.id}" data-table="item_claims">🗑️ Delete</button>
                </td>
            </tr>
        `
    }
    document.getElementById('claimsTable').innerHTML = html
    document.getElementById('claimCount').innerText = claims.length
    
    document.querySelectorAll('.status-claim').forEach(sel => {
        sel.removeEventListener('change', handleClaimStatusChange)
        sel.addEventListener('change', handleClaimStatusChange)
    })
    
    document.querySelectorAll('.delete-claim').forEach(btn => {
        btn.removeEventListener('click', handleDelete)
        btn.addEventListener('click', handleDelete)
    })
}

async function handleClaimStatusChange(e) {
    const select = e.target
    const newStatus = select.value
    const claimId = select.dataset.id
    const { error } = await supabase
        .from('item_claims')
        .update({ status: newStatus })
        .eq('id', claimId)
    if (error) {
        showNotification('Error: ' + error.message, 'error')
    } else {
        showNotification('✅ Claim status updated to ' + newStatus, 'success')
        await loadAllData()
    }
}

// ========== GENERIC DELETE HANDLER ==========
async function handleDelete(e) {
    const button = e.target
    const id = button.dataset.id
    const table = button.dataset.table
    
    let itemName = ''
    if (table === 'lost_found_items') itemName = 'this item'
    if (table === 'complaints') itemName = 'this complaint'
    if (table === 'volunteers') itemName = 'this volunteer application'
    if (table === 'item_claims') itemName = 'this claim'
    
    const confirmed = confirm(`⚠️ Are you sure you want to delete ${itemName}?`)
    
    if (!confirmed) return
    
    try {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw error
        showNotification('✅ Item deleted successfully!', 'success')
        await loadAllData()
    } catch (error) {
        console.error('Delete error:', error)
        showNotification('❌ Delete failed: ' + error.message, 'error')
    }
}

// ========== STATS UPDATE ==========
async function updateStats() {
    const { count: lc } = await supabase.from('lost_found_items').select('*', { count: 'exact', head: true })
    const { count: cc } = await supabase.from('complaints').select('*', { count: 'exact', head: true })
    const { count: vc } = await supabase.from('volunteers').select('*', { count: 'exact', head: true })
    const { count: claimc } = await supabase.from('item_claims').select('*', { count: 'exact', head: true })
    
    const lostCountEl = document.getElementById('lostCount')
    const complaintCountEl = document.getElementById('complaintCount')
    const volunteerCountEl = document.getElementById('volunteerCount')
    const claimCountEl = document.getElementById('claimCount')
    
    if (lostCountEl) lostCountEl.innerText = lc || 0
    if (complaintCountEl) complaintCountEl.innerText = cc || 0
    if (volunteerCountEl) volunteerCountEl.innerText = vc || 0
    if (claimCountEl) claimCountEl.innerText = claimc || 0
}

// ========== ESCAPE HTML ==========
function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;'
        if (m === '<') return '&lt;'
        if (m === '>') return '&gt;'
        return m
    })
}

// ========== SHOW TAB ==========
window.showTab = (id) => {
    const tab = document.querySelector(`[data-bs-target="#${id}"]`)
    if (tab) tab.click()
}

// ========== INITIALIZE ==========
initAdmin()