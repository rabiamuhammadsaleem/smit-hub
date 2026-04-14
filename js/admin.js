import { supabase } from './supabase.js'
import { showNotification } from './common.js'

let currentUser = null
const ADMIN_EMAILS = ['admin@gmail.com']

async function initAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { 
        window.location.href = 'index.html'
        return 
    }
    currentUser = user
    
    if (!ADMIN_EMAILS.includes(user.email)) {
        document.body.innerHTML = `<div class="container mt-5"><div class="alert alert-danger text-center"><h3>⛔ Access Denied</h3><p>Use admin@gmail.com</p><p>Redirecting...</p></div></div>`
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
        html += `<tr>
            <td style="width:50px; text-align:center;">${serialNo++}</td>
            <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.title}">${item.title}</td>
            <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.description || ''}">${item.description?.substring(0,40) || '-'}...</td>
            <td style="width:110px;">
                <select class="form-select form-select-sm status-lost" data-id="${item.id}" data-table="lost_found_items" style="width:100px">
                    <option ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option ${item.status === 'Found' ? 'selected' : ''}>Found</option>
                </select>
            </td>
            <td style="width:80px;">${item.user_id?.substring(0,8)}...</td>
            <td style="white-space:nowrap; width:100px;">${new Date(item.created_at).toLocaleDateString()}</td>
            <td style="width:80px;">
                <button class="btn btn-danger btn-sm" onclick="window.deleteAdminItem('${item.id}', 'lost_found_items')">Delete</button>
            </td>
        </tr>`
    }
    document.getElementById('lostFoundTable').innerHTML = html
    
    document.querySelectorAll('.status-lost').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            await supabase
                .from('lost_found_items')
                .update({ status: sel.value })
                .eq('id', sel.dataset.id)
            await loadAllData()
        })
    })
}

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
        html += `<tr>
            <td style="width:50px; text-align:center;">${serialNo++}</td>
            <td style="width:120px;">${c.category}</td>
            <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.description || ''}">${c.description?.substring(0,40) || '-'}...</td>
            <td style="width:130px;">
                <select class="form-select form-select-sm status-complaint" data-id="${c.id}" data-table="complaints" style="width:120px">
                    <option ${c.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
                    <option ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
            </td>
            <td style="width:80px;">${c.user_id?.substring(0,8)}...</td>
            <td style="white-space:nowrap; width:100px;">${new Date(c.created_at).toLocaleDateString()}</td>
            <td style="width:80px;">
                <button class="btn btn-danger btn-sm" onclick="window.deleteAdminItem('${c.id}', 'complaints')">Delete</button>
            </td>
        </tr>`
    }
    document.getElementById('complaintsTable').innerHTML = html
    
    document.querySelectorAll('.status-complaint').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            await supabase
                .from('complaints')
                .update({ status: sel.value })
                .eq('id', sel.dataset.id)
            await loadAllData()
        })
    })
}

async function loadVolunteers() {
    const { data } = await supabase
        .from('volunteers')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (!data?.length) {
        document.getElementById('volunteersTable').innerHTML = '<tr><td colspan="6" class="text-center">No data found</td></tr>'
        return
    }
    
    let html = ''
    let serialNo = 1
    for (let v of data) {
        html += `<tr>
            <td style="width:50px; text-align:center;">${serialNo++}</td>
            <td>${v.name}</td>
            <td>${v.event}</td>
            <td>${v.availability}</td>
            <td style="width:80px;">${v.user_id?.substring(0,8)}...</td>
            <td style="white-space:nowrap; width:100px;">${new Date(v.created_at).toLocaleDateString()}</td>
        </tr>`
    }
    document.getElementById('volunteersTable').innerHTML = html
}

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
        html += `<tr>
            <td style="width:50px; text-align:center;">${serialNo++}</td>
            <td>${itemMap[claim.item_id] || 'Item ' + claim.item_id}</td>
            <td>${claim.claimant_name}</td>
            <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${claim.claimant_email}</td>
            <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${claim.message || ''}">${claim.message?.substring(0,30) || '-'}</td>
            <td style="width:110px;">
                <select class="form-select form-select-sm status-claim" data-id="${claim.id}" data-table="item_claims" style="width:100px">
                    <option ${claim.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option ${claim.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option ${claim.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </td>
            <td style="white-space:nowrap; width:150px;">${new Date(claim.created_at).toLocaleString()}</td>
            <td style="width:80px;">
                <button class="btn btn-danger btn-sm" onclick="window.deleteAdminItem('${claim.id}', 'item_claims')">Delete</button>
            </td>
        </tr>`
    }
    document.getElementById('claimsTable').innerHTML = html
    document.getElementById('claimCount').innerText = claims.length
    
    document.querySelectorAll('.status-claim').forEach(sel => {
        sel.addEventListener('change', async (e) => {
            await supabase
                .from('item_claims')
                .update({ status: sel.value })
                .eq('id', sel.dataset.id)
            await loadAllData()
        })
    })
}

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

window.deleteAdminItem = async (id, table) => {
    if (confirm('Delete this item?')) {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) {
            showNotification(error.message, 'error')
        } else {
            showNotification('Item deleted successfully!')
            await loadAllData()
        }
    }
}

window.showTab = (id) => {
    const tab = document.querySelector(`[data-bs-target="#${id}"]`)
    if (tab) tab.click()
}

// Initialize
initAdmin()