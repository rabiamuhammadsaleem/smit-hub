import { supabase } from './supabase.js'
import { getCurrentUser, showNotification, formatDate } from './common.js'

let currentUser = null
let currentItemId = null

async function initLostFound() {
    currentUser = await getCurrentUser()
    if (!currentUser) {
        window.location.href = 'index.html'
        return
    }
    await loadAllItems()
    
    document.getElementById('postItemForm')?.addEventListener('submit', postItem)
    document.getElementById('submitClaimBtn')?.addEventListener('click', submitClaim)
    document.getElementById('logoutBtn')?.addEventListener('click', () => { supabase.auth.signOut(); window.location.href = 'index.html' })
    
    // Image preview
    const imageInput = document.getElementById('itemImage')
    if (imageInput) {
        imageInput.addEventListener('change', previewImage)
    }
}

function previewImage(e) {
    const file = e.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = function(event) {
            const preview = document.getElementById('imagePreview')
            const previewImg = document.getElementById('previewImg')
            previewImg.src = event.target.result
            preview.style.display = 'block'
        }
        reader.readAsDataURL(file)
    }
}

async function uploadImage(file) {
    if (!file) return null
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${currentUser.id}/${fileName}`
    
    const { data, error } = await supabase.storage
        .from('lost-found-images')
        .upload(filePath, file)
    
    if (error) {
        console.error('Upload error:', error)
        showNotification('Image upload failed: ' + error.message, 'error')
        return null
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('lost-found-images')
        .getPublicUrl(filePath)
    
    return publicUrl
}

async function postItem(e) {
    e.preventDefault()
    
    const type = document.getElementById('itemType').value
    const title = (type === 'lost' ? '🔴 LOST - ' : '🟢 FOUND - ') + document.getElementById('title').value
    const description = document.getElementById('description').value
    
    showNotification('Uploading image...')
    
    // Upload image if selected
    const imageFile = document.getElementById('itemImage').files[0]
    let imageUrl = null
    
    if (imageFile) {
        imageUrl = await uploadImage(imageFile)
    }
    
    const { error } = await supabase.from('lost_found_items').insert([{ 
        user_id: currentUser.id, 
        title: title, 
        description: description, 
        image_url: imageUrl, 
        status: 'Pending' 
    }])
    
    if (error) {
        showNotification('Error: ' + error.message, 'error')
    } else {
        showNotification('Item posted successfully!')
        document.getElementById('postItemForm').reset()
        document.getElementById('imagePreview').style.display = 'none'
        bootstrap.Modal.getInstance(document.getElementById('postItemModal')).hide()
        await loadAllItems()
    }
}

async function loadAllItems() {
    const { data: items } = await supabase.from('lost_found_items').select('*').order('created_at', { ascending: false })
    const { data: claims } = await supabase.from('item_claims').select('*')
    
    if (!items?.length) {
        document.getElementById('itemsList').innerHTML = '<div class="col-12"><div class="alert alert-info">No items yet. Click "Post New Item" to add.</div></div>'
        return
    }
    
    let html = ''
    for (let item of items) {
        const isOwner = item.user_id === currentUser.id
        const itemClaims = claims?.filter(c => c.item_id === item.id) || []
        const raisedCount = itemClaims.length
        
        let claimsHtml = raisedCount ? `<ul class="mb-0 mt-1 ps-3">${itemClaims.map(c => `<li><strong>${c.claimant_name}</strong> - ${c.message?.substring(0, 50) || 'No message'}</li>`).join('')}</ul>` : '<p class="text-muted small mb-0">No one has raised hand yet</p>'
        
        html += `<div class="col-md-4 col-sm-6 mb-3">
            <div class="card card-item p-3">
                <div class="d-flex justify-content-between align-items-start">
                    <h5 class="mb-1">${item.title}</h5>
                    <span class="${item.status === 'Pending' ? 'status-pending' : 'status-found'}">${item.status}</span>
                </div>
                <p class="text-muted small mb-2">Posted: ${formatDate(item.created_at)}</p>
                <p class="mb-2">${item.description}</p>
                ${item.image_url ? `<img src="${item.image_url}" style="max-height:120px" class="rounded mb-2 w-100">` : ''}
                <div class="claims-list"><div class="d-flex justify-content-between"><strong>👋 Raised Hands</strong><span class="raised-count">${raisedCount}</span></div>${claimsHtml}</div>
                <div class="mt-2">
                    ${item.status === 'Pending' && !isOwner ? `<button class="raise-hand-btn" onclick="window.openRaiseHandModal(${item.id})">👋 Raise Hand</button>` : ''}
                    ${isOwner && item.status === 'Pending' ? `<button class="btn btn-sm btn-success w-100" onclick="window.markAsFound(${item.id})">✅ Mark as Found</button>` : ''}
                </div>
            </div>
        </div>`
    }
    document.getElementById('itemsList').innerHTML = html
}

window.markAsFound = async (id) => {
    if (confirm('Mark this item as found?')) {
        await supabase.from('lost_found_items').update({ status: 'Found' }).eq('id', id)
        showNotification('Item marked as found!')
        await loadAllItems()
    }
}

window.openRaiseHandModal = (itemId) => {
    currentItemId = itemId
    document.getElementById('claimItemId').value = itemId
    document.getElementById('claimantName').value = ''
    document.getElementById('claimMessage').value = ''
    new bootstrap.Modal(document.getElementById('raiseHandModal')).show()
}

async function submitClaim() {
    const name = document.getElementById('claimantName').value
    if (!name) { showNotification('Please enter your name', 'error'); return }
    await supabase.from('item_claims').insert([{ 
        item_id: currentItemId, 
        claimant_user_id: currentUser.id, 
        claimant_email: currentUser.email, 
        claimant_name: name, 
        message: document.getElementById('claimMessage').value, 
        status: 'Pending' 
    }])
    showNotification('Claim submitted! Admin will review.')
    bootstrap.Modal.getInstance(document.getElementById('raiseHandModal')).hide()
    await loadAllItems()
}

initLostFound()