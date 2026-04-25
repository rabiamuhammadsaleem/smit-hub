import { supabase } from './supabase.js'
import { getCurrentUser, showNotification, formatDate } from './common.js'

let currentUser = null
let currentFilter = 'all'
let matchedItemIds = new Set()

async function initLostFound() {
    currentUser = await getCurrentUser()
    if (!currentUser) {
        window.location.href = 'index.html'
        return
    }
    
    await loadAllItems()
    await loadStats()
    await detectMatches()
    
    document.getElementById('postItemForm')?.addEventListener('submit', postItem)
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        supabase.auth.signOut()
        window.location.href = 'index.html'
    })
    
    const imageInput = document.getElementById('itemImage')
    if (imageInput) {
        imageInput.addEventListener('change', previewImage)
    }
}

window.filterItems = filterItems

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

// ========== DETECT MATCHES AND SAVE TO DATABASE ==========
async function detectMatches() {
    const { data: items } = await supabase.from('lost_found_items').select('*')
    if (!items?.length) return
    
    const lostItems = items.filter(i => i.category === 'lost')
    const foundItems = items.filter(i => i.category === 'found')
    
    // Get existing matches to avoid duplicates
    const { data: existingMatches } = await supabase.from('item_matches').select('*')
    const existingKeys = new Set(existingMatches?.map(m => `${m.lost_item_id}|${m.found_item_id}`) || [])
    
    matchedItemIds.clear()
    const newMatches = []
    
    for (const lost of lostItems) {
        for (const found of foundItems) {
            const key = `${lost.id}|${found.id}`
            if (existingKeys.has(key)) {
            
                matchedItemIds.add(lost.id)
                matchedItemIds.add(found.id)
                continue
            }
            
            let score = 0
            const lostTitle = lost.title?.toLowerCase() || ''
            const foundTitle = found.title?.toLowerCase() || ''
            const lostDesc = lost.description?.toLowerCase() || ''
            const foundDesc = found.description?.toLowerCase() || ''
            
            // Title matching
            const lostTitleWords = lostTitle.split(' ')
            const foundTitleWords = foundTitle.split(' ')
            for (const lw of lostTitleWords) {
                if (lw.length < 3) continue
                for (const fw of foundTitleWords) {
                    if (fw.length < 3) continue
                    if (lw === fw || lw.includes(fw) || fw.includes(lw)) score += 30
                }
            }
            
            // Description matching
            const lostDescWords = lostDesc.split(' ')
            const foundDescWords = foundDesc.split(' ')
            for (const lw of lostDescWords) {
                if (lw.length < 4) continue
                for (const fw of foundDescWords) {
                    if (fw.length < 4) continue
                    if (lw === fw || lw.includes(fw) || fw.includes(lw)) score += 20
                }
            }
            
            if (score >= 50) {
                matchedItemIds.add(lost.id)
                matchedItemIds.add(found.id)
                newMatches.push({
                    lost_item_id: lost.id,
                    found_item_id: found.id,
                    match_score: Math.min(score, 100)
                })
            }
        }
    }
    
    // Save new matches to database
    if (newMatches.length > 0) {
        for (const match of newMatches) {
            await supabase.from('item_matches').insert(match)
        }
        console.log(`✅ Saved ${newMatches.length} new matches to database`)
    }
    
    // Update stats after detection
    await loadStats()
}

// ========== STATS ==========

async function loadStats() {
    const { data: items } = await supabase.from('lost_found_items').select('*')
    
    const lostItems = items?.filter(i => i.category === 'lost') || []
    const foundItems = items?.filter(i => i.category === 'found') || []
    
    document.getElementById('lostCount').innerText = lostItems.length
    document.getElementById('foundCount').innerText = foundItems.length
}


// ========== UPLOAD IMAGE ==========
async function uploadImage(file) {
    if (!file) return null
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`
    const filePath = `${currentUser.id}/${fileName}`
    
    const { error } = await supabase.storage.from('lost-found-images').upload(filePath, file)
    if (error) { 
        showNotification('Upload failed: ' + error.message, 'error')
        return null 
    }
    const { data: urlData } = supabase.storage.from('lost-found-images').getPublicUrl(filePath)
    return urlData.publicUrl
}

// ========== POST ITEM ==========
async function postItem(e) {
    e.preventDefault()
    
    const imageFile = document.getElementById('itemImage').files[0]
    let imageUrl = null
    if (imageFile) {
        showNotification('Uploading image...')
        imageUrl = await uploadImage(imageFile)
    }
    
    const { error } = await supabase.from('lost_found_items').insert({
        user_id: currentUser.id,
        title: document.getElementById('title').value,
        category: document.getElementById('itemType').value,
        description: document.getElementById('description').value,
        location: document.getElementById('location')?.value || '',
        contact_number: document.getElementById('contactNumber')?.value || '',  
        image_url: imageUrl,
        status: 'pending'
    })
    
    if (error) {
        showNotification('Error: ' + error.message, 'error')
    } else {
        showNotification('✅ Item posted!', 'success')
        document.getElementById('postItemForm').reset()
        document.getElementById('imagePreview').style.display = 'none'
        bootstrap.Modal.getInstance(document.getElementById('postItemModal')).hide()
        await loadAllItems()
        await detectMatches()
        await loadStats()
    }
}

// ========== FILTER ITEMS ==========
function filterItems(filter) {
    currentFilter = filter
    document.querySelectorAll('.btn-outline-primary').forEach(btn => {
        btn.classList.remove('active')
    })
    if (event && event.target) {
        event.target.classList.add('active')
    }
    loadAllItems()
}

// ========== LOAD ITEMS ==========
async function loadAllItems() {
    const { data: items, error } = await supabase
        .from('lost_found_items')
        .select('*')
        .order('created_at', { ascending: false })
    
    if (error) {
        console.error("Error loading items:", error)
        return
    }
    
    let itemsData = items || []
    
    if (currentFilter === 'lost') {
        itemsData = itemsData.filter(i => i.category === 'lost')
    } else if (currentFilter === 'found') {
        itemsData = itemsData.filter(i => i.category === 'found')
    } else if (currentFilter !== 'all') {
        itemsData = itemsData.filter(i => i.title?.toLowerCase().includes(currentFilter))
    }
    
    const itemsList = document.getElementById('itemsList')
    
    if (!itemsList) return
    
    if (itemsData.length === 0) {
        itemsList.innerHTML = '<div class="col-12"><div class="alert alert-info text-center">No items found</div></div>'
        return
    }
    
    let html = '<div class="row g-3">'
    for (const item of itemsData) {
        const isMatched = matchedItemIds.has(item.id)
        const isOwner = item.user_id === currentUser.id
        const dullClass = isMatched ? 'card-matched' : ''
        
        html += `
    <div class="col-md-4 col-sm-6">
        <div class="card card-item ${dullClass}">
            ${item.image_url ? `<img src="${item.image_url}" class="card-item-img" onerror="this.src='https://placehold.co/400x140?text=No+Image'">` : '<div class="card-item-img bg-light d-flex align-items-center justify-content-center"><span class="text-muted">📷 No Image</span></div>'}
            <div class="p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0 fw-bold" style="color: #0057a8;">${escapeHtml(item.title)}</h6>
                    <span class="${item.status === 'pending' ? 'status-pending' : 'status-found'}">${item.status}</span>
                </div>
                <p class="small text-secondary mb-2">📅 ${formatDate(item.created_at)}</p>
                <p class="small mb-2">${escapeHtml(item.description.substring(0, 100))}${item.description.length > 100 ? '...' : ''}</p>
                ${item.location ? `<p class="small text-muted mb-2">📍 ${escapeHtml(item.location)}</p>` : ''}
                ${item.contact_number ? `<p class="small text-muted mb-1">📞 ${escapeHtml(item.contact_number)}</p>` : ''}
                <!-- Raise Hand button removed -->
            </div>
        </div>
    </div>
`
    }
    html += '</div>'
    itemsList.innerHTML = html
}

async function markAsFound(id) {
    if (confirm('Mark this item as found?')) {
        await supabase.from('lost_found_items').update({ status: 'found' }).eq('id', id)
        showNotification('✅ Item marked as found!')
        await loadAllItems()
        await detectMatches()
        await loadStats()
    }
}

function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m))
}

initLostFound()