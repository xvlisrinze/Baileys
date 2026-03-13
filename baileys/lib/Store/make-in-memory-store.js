import { proto } from '../../WAProto/index.js'
import { DEFAULT_CONNECTION_CONFIG } from '../Defaults/index.js'
import { LabelAssociationType } from '../Types/LabelAssociation.js'
import { md5, toNumber, updateMessageWithReceipt, updateMessageWithReaction } from '../Utils/index.js'
import { jidDecode, jidNormalizedUser } from '../WABinary/index.js'
import makeOrderedDictionary from './make-ordered-dictionary.js'
import { ObjectRepository } from './object-repository.js'
import KeyedDB from '@whiskeysockets/keyed-db'

export const waChatKey = (pin) => ({
    key: (c) => (pin ? (c.pinned ? '1' : '0') : '') + (c.archived ? '0' : '1') + (c.conversationTimestamp ? c.conversationTimestamp.toString(16).padStart(8, '0') : '') + c.id,
    compare: (k1, k2) => k2.localeCompare(k1)
})

export const waMessageID = (m) => m.key.id || ''

export const waLabelAssociationKey = {
    key: (la) => (la.type === LabelAssociationType.Chat ? la.chatId + la.labelId : la.chatId + la.messageId + la.labelId),
    compare: (k1, k2) => k2.localeCompare(k1)
}

const makeMessagesDictionary = () => makeOrderedDictionary(waMessageID)

const makeInMemoryStore = (config) => {
    const socket = config.socket
    const chatKey = config.chatKey || waChatKey(true)
    const labelAssociationKey = config.labelAssociationKey || waLabelAssociationKey
    const logger = config.logger || DEFAULT_CONNECTION_CONFIG.logger.child({ stream: 'in-mem-store' })

    const chats = new KeyedDB(chatKey, c => c.id)
    const messages = {}
    const contacts = {}
    const groupMetadata = {}
    const presences = {}
    const state = { connection: 'close' }
    const labels = new ObjectRepository()
    const labelAssociations = new KeyedDB(labelAssociationKey, labelAssociationKey.key)

    const assertMessageList = (jid) => {
        if (!messages[jid]) {
            messages[jid] = makeMessagesDictionary()
        }
        return messages[jid]
    }

    const contactsUpsert = (newContacts) => {
        const oldContacts = new Set(Object.keys(contacts))
        for (const contact of newContacts) {
            oldContacts.delete(contact.id)
            contacts[contact.id] = Object.assign(contacts[contact.id] || {}, contact)
        }
        return oldContacts
    }

    const labelsUpsert = (newLabels) => {
        for (const label of newLabels) {
            labels.upsertById(label.id, label)
        }
    }

    const getValidContacts = () => {
        for (const contact of Object.keys(contacts)) {
            if (contact.indexOf('@') < 0) delete contacts[contact]
        }
        return Object.keys(contacts)
    }

    const bind = (ev) => {
        ev.on('connection.update', update => Object.assign(state, update))

        ev.on('messages.upsert', ({ messages: newMessages, type }) => {
            if (type === 'append' || type === 'notify') {
                for (const msg of newMessages) {
                    const jid = jidNormalizedUser(msg.key.remoteJid)
                    const list = assertMessageList(jid)
                    list.upsert(msg, 'append')
                }
            }
        })

        ev.on('messages.update', updates => {
            for (const { update, key } of updates) {
                const list = assertMessageList(jidNormalizedUser(key.remoteJid))
                list.updateAssign(key.id, update)
            }
        })

        ev.on('messages.delete', item => {
            if ('all' in item) {
                messages[item.jid]?.clear()
            } else {
                const jid = item.keys[0].remoteJid
                const list = messages[jid]
                if (list) {
                    const idSet = new Set(item.keys.map(k => k.id))
                    list.filter(m => !idSet.has(m.key.id))
                }
            }
        })

        ev.on('contacts.upsert', contactsUpsert)

        ev.on('chats.upsert', newChats => chats.upsert(...newChats))
    }

    const toJSON = () => ({
        chats,
        contacts,
        messages,
        labels,
        labelAssociations
    })

    const fromJSON = (json) => {
        chats.upsert(...json.chats)
        labelAssociations.upsert(...json.labelAssociations || [])
        contactsUpsert(Object.values(json.contacts))
        labelsUpsert(Object.values(json.labels || {}))
        for (const jid in json.messages) {
            const list = assertMessageList(jid)
            for (const msg of json.messages[jid]) {
                list.upsert(proto.WebMessageInfo.fromObject(msg), 'append')
            }
        }
    }

    return {
        chats,
        contacts,
        messages,
        groupMetadata,
        state,
        presences,
        labels,
        labelAssociations,
        bind,
        loadMessage: async (jid, id) => messages[jid]?.get(id),
        mostRecentMessage: async (jid) => messages[jid]?.array.slice(-1)[0],
        fetchMessageReceipts: async ({ remoteJid, id }) => messages[remoteJid]?.get(id)?.userReceipt,
        toJSON,
        fromJSON
    }
}

export { makeInMemoryStore }
export default makeInMemoryStore