const { decryptMedia } = require('@open-wa/wa-automate')
const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const ytdl = require('ytdl-core')
const ffmpeg = require('fluent-ffmpeg')
const { translate } = require('free-translate')
const axios = require('axios')
const fetch = require('node-fetch')
const gTTS = require('gtts')
const toPdf = require("office-to-pdf")
const _ = require('underscore')
const appRoot = require('app-root-path')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db_group = new FileSync(appRoot + '/data/denda.json')
const db = low(db_group)

db.defaults({ group: [] }).write()

const {
    removeBackgroundFromImageBase64
} = require('remove.bg')

let {
    menuId,
    cekResi,
    urlShortener,
    meme,
    getLocationData,
    images,
    api,
    cariKasar,
    kbbi,
    list
} = require('./lib')

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const {
    msgFilter,
    color,
    processTime,
    isUrl,
    download,
    createReadFileSync
} = require('./utils')

const fs = require('fs-extra')
const { uploadImages } = require('./utils/fetcher')

const setting = JSON.parse(createReadFileSync('./settings/setting.json'))
const skripsi = JSON.parse(createReadFileSync('./settings/skripsi.json'))
const kataKasar = JSON.parse(createReadFileSync('./settings/katakasar.json'))
const { apiNoBg } = JSON.parse(createReadFileSync('./settings/api.json'))

const banned = JSON.parse(createReadFileSync('./data/banned.json'))
const ngegas = JSON.parse(createReadFileSync('./data/ngegas.json'))
const welcome = JSON.parse(createReadFileSync('./data/welcome.json'))

let {
    ownerNumber,
    groupLimit,
    memberLimit,
    prefix
} = setting

function formatin(duit) {
    let reverse = duit.toString().split('').reverse().join('');
    let ribuan = reverse.match(/\d{1,3}/g);
    ribuan = ribuan.join('.').split('').reverse().join('');
    return ribuan;
}

const inArray = (needle, haystack) => {
    let length = haystack.length;
    for (let i = 0; i < length; i++) {
        if (haystack[i].id == needle) return i;
    }
    return false;
}

module.exports = HandleMsg = async (client, message) => {
    try {
        const { type, id, from, t, sender, author, isGroupMsg, chat, chatId, caption, isMedia, mimetype, quotedMsg, quotedMsgObj, mentionedJidList } = message
        let { body } = message
        var { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
        const botNumber = await client.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await client.getGroupAdmins(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
        const chats = (type === 'chat') ? body : (type === 'image' || type === 'video') ? caption : ''
        const pengirim = sender.id
        const stickermsg = message.type === 'sticker'
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false
        const stickerMetadata = { pack: 'Created with', author: 'SeroBot', keepScale: true }
        const stickerMetadataCrop = { pack: 'Created with', author: 'SeroBot' }

        // Bot Prefix
        body = (type === 'chat' && body.startsWith(prefix)) ? body : ((type === 'image' && caption || type === 'video' && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.trim().substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
        const isCmd = body.startsWith(prefix)
        const url = args.length !== 0 ? args[0] : ''

        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'
        const isQuotedChat = quotedMsg && quotedMsg.type === 'chat'
        const isQuotedLocation = quotedMsg && quotedMsg.type === 'location'
        const isQuotedDocs = quotedMsg && quotedMsg.type === 'document'

        // [IDENTIFY]
        const isOwnerBot = ownerNumber.includes(pengirim)
        const isBanned = banned.includes(pengirim)
        const isNgegas = ngegas.includes(chatId)
        const isKasar = await cariKasar(chats)

        // [BETA] Avoid Spam Message
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg && !isOwnerBot) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)), client.reply(from, 'Mohon untuk tidak melakukan spam', id) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg && !isOwnerBot) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)), client.reply(from, 'Mohon untuk tidak melakukan spam', id) }
        if (!isCmd && isKasar && isGroupMsg) { console.log(color('[BADW]', 'orange'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }


        //[BETA] Avoid Spam Message
        msgFilter.addFilter(from)

        //[AUTO READ] Auto read message 
        client.sendSeen(chatId)

        // Filter Banned People
        if (isBanned && !isGroupMsg) {
            return client.sendText(from, `Maaf anda telah dibanned oleh bot karena melanggar tnc`).then(() => {
                console.log(color('[BAN\'d]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
            })
        }
        if (isBanned) {
            return console.log(color('[BAN\'d]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }
        
        //msg response
        const resMsg = {
            wait: _.sample([
                'Sedang diproses! Silahkan tunggu sebentar...',
                'Copy that, processing!',
                'Gotcha, please wait!',
                'Copy that bro, please wait!',
                'Okey, tunggu sebentar...',
                'Baiklah, sabar ya!'
            ]),
            error: {
                norm: 'Maaf, Ada yang error! Coba lagi beberapa menit kemudian.',
                admin: 'Perintah ini hanya untuk admin group!',
                owner: 'Perintah ini hanya untuk owner bot!',
                group: 'Maaf, perintah ini hanya dapat dipakai didalam grup!',
                botAdm: 'Perintah ini hanya bisa di gunakan ketika bot menjadi admin'
            },
            success: {
                join: 'Berhasil join grup via link!'
            },
            badw: _.sample([
                'Astaghfirullah...',
                'Jaga ketikanmu sahabat!',
                'Yo rasah nggo misuh cuk!',
                'Istighfar dulu sodaraku',
                'Hadehh...',
                'Ada masalah apasih?'
            ])
        }
        // respon to msg
        if (['p', 'assalamualaikum', 'assalamu\'alaikum', 'asalamualaikum', 'assalamu\'alaykum', 'punten'].includes(message.body && message.body.toLowerCase())) {
          await client.sendText(from, 'Wa\'alaikumussalam Wr. Wb.')
        }
        if (['hi', 'hy', 'halo', 'hai'].includes(message.body && message.body.toLowerCase())) {
          await client.sendText(from, 'Halo ????')
        }

        // Ini Command nya
        if (isCmd) {
            client.simulateTyping(chat.id, true).then(async () => {
                switch (command) {
                    // Menu and TnC
                    case 'speed':
                    case 'ping':
                        await client.sendText(from, `Pong!!!\nSpeed: ${processTime(t, moment())} _Seconds_`)
                        break
                    case 'tnc':
                        await client.sendText(from, menuId.textTnC())
                        break
                    case 'notes':
                    case 'menu':
                    case 'help':
                    case 'start':
                        await client.sendText(from, menuId.textMenu(pushname))
                            .then(() => ((isGroupMsg) && (isGroupAdmins)) ? client.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
                        break
                    case 'menuadmin':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        await client.sendText(from, menuId.textAdmin())
                        break
                    case 'donate':
                    case 'donasi':
                        await client.sendText(from, menuId.textDonasi())
                        break
                    case 'owner':
                        await client.sendContact(from, ownerNumber)
                            .then(() => client.sendText(from, 'Jika ada pertanyaan tentang bot silahkan chat nomor di atas'))
                        break
                    case 'join':
                        if (args.length == 0) return client.reply(from, `Jika kalian ingin mengundang bot ke group silahkan invite atau dengan\nketik ${prefix}join [link group]`, id)
                        linkgrup = args[0]
                        let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
                        let chekgrup = await client.inviteInfo(linkgrup)
                        if (!islink) return client.reply(from, 'Maaf link group-nya salah! silahkan kirim link yang benar', id)
                        if (isOwnerBot) {
                            await client.joinGroupViaLink(linkgrup)
                                .then(async () => {
                                    await client.sendText(from, resMsg.success.join)
                                    await client.sendText(chekgrup.id, `Hai guys ???? perkenalkan saya SeroBot. Untuk melihat perintah/menu yang tersedia pada bot, kirim ${prefix}menu`)
                                })
                        } else {
                            let cgrup = await client.getAllGroups()
                            if (cgrup.length > groupLimit) return client.reply(from, `Mohon maaf, untuk mencegah overload, group pada bot dibatasi.\nTotal group: ${cgrup.length}/${groupLimit}\nChat /owner for appeal`, id)
                            if (cgrup.size < memberLimit) return client.reply(from, `Sorry, Bot wil not join if the group members do not exceed ${memberLimit} people`, id)
                            await client.joinGroupViaLink(linkgrup)
                                .then(async () => {
                                    await client.reply(from, resMsg.success.join, id)
                                    await client.sendText(chekgrup.id, `Hai guys ???? perkenalkan saya SeroBot. Untuk melihat perintah/menu yang tersedia pada bot, kirim ${prefix}menu`)
                                })
                                .catch(async () => {
                                    await client.reply(from, 'Gagal!', id)
                                })
                        }
                        break
                    case 'stat':
                    case 'status':
                    case 'botstat': {
                        const loadedMsg = await client.getAmountOfLoadedMessages()
                        const chatIds = await client.getAllChatIds()
                        const groups = await client.getAllGroups()
                        client.sendText(from, `Status :\n- *${loadedMsg}* Loaded Messages\n- *${groups.length}* Group Chats\n- *${chatIds.length - groups.length}* Personal Chats\n- *${chatIds.length}* Total Chats\nSpeed: ${processTime(t, moment())} _Seconds_`)
                        break
                    }

                    //Sticker Converter to img
                    case 'getimage':
                    case 'stikertoimg':
                    case 'stickertoimg':
                    case 'stimg':
                        if (quotedMsg && quotedMsg.type == 'sticker') {
                            const mediaData = await decryptMedia(quotedMsg)
                            client.reply(from, resMsg.wait, id)
                            const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                            await client.sendFile(from, imageBase64, 'imgsticker.jpg', 'Berhasil convert Sticker to Image!', id)
                                .then(() => {
                                    console.log(`Sticker to Image Processed for ${processTime(t, moment())} Seconds`)
                                })
                        } else if (!quotedMsg) return client.reply(from, `Silakan tag/reply sticker yang ingin dijadikan gambar dengan command!`, id)
                        break

                    // Sticker Creator
                    case 'sticker':
                    case 'stiker':
                        if (type === 'video' || isQuotedVideo) return client.reply(from, `Media yang dikirimkan harus berupa gambar, untuk video gunakan ${prefix}stickergif.`, id)
                        if ((isMedia || isQuotedImage) && (args.length === 0 || args[0] === 'crop')) {
                            client.reply(from, resMsg.wait, id)
                            try {
                                const encryptMedia = isQuotedImage ? quotedMsg : message
                                const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                                const _metadata = (args[0] === 'crop') ? stickerMetadataCrop : stickerMetadata
                                const mediaData = await decryptMedia(encryptMedia)
                                    .catch(err => {
                                        console.log(err)
                                        client.sendText(from, resMsg.error.norm)
                                    })
                                client.sendImageAsSticker(from, mediaData, _metadata)
                                    .then(() => {
                                        client.sendText(from, 'Here\'s your sticker')
                                        console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                                    }).catch(err => {
                                        console.log(err)
                                        client.sendText(from, resMsg.error.norm)
                                    })
                            } catch (err) {
                                console.log(err)
                                client.sendText(from, resMsg.error.norm)
                            }

                        } else if (args[0] === 'nobg') {
                            if (isMedia || isQuotedImage) {
                                client.reply(from, resMsg.wait, id)
                                try {
                                    var encryptedMedia = isQuotedImage ? quotedMsg : message
                                    var _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype

                                    var mediaData = await decryptMedia(encryptedMedia)
                                        .catch(err => {
                                            console.log(err)
                                            client.sendText(from, resMsg.error.norm)
                                        })
                                    if (mediaData === undefined) return client.sendText(from, resMsg.error.norm)
                                    var imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                                    base64img = imageBase64
                                    var outFile = './media/noBg.png'
                                    // kamu dapat mengambil api key dari website remove.bg dan ubahnya difolder settings/api.json
                                    var selectedApiNoBg = _.sample(apiNoBg)
                                    var result = await removeBackgroundFromImageBase64({ base64img, apiKey: selectedApiNoBg, size: 'auto', type: 'auto', outFile })
                                    await fs.writeFile(outFile, result.base64img)
                                    await client.sendImageAsSticker(from, `data:${_mimetype};base64,${result.base64img}`, stickerMetadata)
                                        .then(() => {
                                            client.sendText(from, 'Here\'s your sticker')
                                            console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                                        }).catch(err => {
                                            console.log(err)
                                            client.sendText(from, resMsg.error.norm)
                                        })

                                } catch (err) {
                                    console.log(err)
                                    if (err[0].code === 'unknown_foreground') client.reply(from, 'Maaf batas objek dan background tidak jelas!', id)
                                    else await client.reply(from, 'Maaf terjadi error atau batas penggunaan sudah tercapai!', id)
                                }
                            }
                        } else if (args.length === 1) {
                            try {
                                if (!isUrl(url)) { return client.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id) }
                                client.sendStickerfromUrl(from, url).then((r) => (!r && r !== undefined)
                                    ? client.sendText(from, 'Maaf, link yang kamu kirim tidak memuat gambar.')
                                    : client.reply(from, 'Here\'s your sticker')).then(() => console.log(`Sticker Processed for ${processTime(t, moment())} Second`))
                            } catch (e) {
                                console.log(`Sticker url err: ${e}`)
                                client.sendText(from, resMsg.error.norm)
                            }
                        } else {
                            await client.reply(from, `Tidak ada gambar! Untuk menggunakan ${prefix}sticker\n\n\nKirim gambar dengan caption\n*${prefix}sticker* (biasa uncrop)\n*${prefix}sticker crop* (square crop)\n*${prefix}sticker nobg* (tanpa background)\n\natau Kirim pesan dengan\n*${prefix}sticker <link_gambar>*`, id)
                        }
                        break

                    case 'stickergif':
                    case 'stikergif':
                        if (isMedia || isQuotedVideo) {
                            if (type === 'image' || isQuotedImage) return client.reply(from, `Media yang dikirimkan harus berupa video/gif, untuk gambar gunakan ${prefix}sticker.`, id)
                            if (mimetype === 'video/mp4' && message.duration <= 9 || (quotedMsg && quotedMsg.mimetype === 'video/mp4') && quotedMsg.duration <= 9) {
                                var encryptedMedia = isQuotedVideo ? quotedMsg : message
                                var mediaData = await decryptMedia(encryptedMedia)
                                client.reply(from, resMsg.wait, id)
                                await client.sendMp4AsSticker(from, mediaData, { endTime: '00:00:09.0', log: true }, stickerMetadata)
                                    .then(() => console.log(`Sticker Processed for ${processTime(t, moment())} Second`))
                                    .catch(() => {
                                        client.reply(from, 'Maaf terjadi error atau filenya terlalu besar!', id)
                                    })
                            } else {
                                client.reply(from, `Kirim video dengan caption *${prefix}stickergif* max 8 secs!`, id)
                            }
                        } else {
                            client.reply(from, `Kirim video atau reply/quote video dengan caption *${prefix}stickergif* max 8 secs`, id)
                        }
                        break

                    case 'stikergiphy':
                    case 'stickergiphy':
                        if (args.length !== 1) return client.reply(from, `Maaf, format pesan salah.\nKetik pesan dengan ${prefix}stickergiphy <link_giphy>`, id)
                        const isGiphy = url.match(new RegExp(/https?:\/\/(www\.)?giphy.com/, 'gi'))
                        const isMediaGiphy = url.match(new RegExp(/https?:\/\/media.giphy.com\/media/, 'gi'))
                        if (isGiphy) {
                            const getGiphyCode = url.match(new RegExp(/(\/|\-)(?:.(?!(\/|\-)))+$/, 'gi'))
                            if (!getGiphyCode) { return client.reply(from, 'Gagal mengambil kode giphy', id) }
                            const giphyCode = getGiphyCode[0].replace(/[-\/]/gi, '')
                            const smallGifUrl = 'https://media.giphy.com/media/' + giphyCode + '/giphy-downsized.gif'
                            client.sendGiphyAsSticker(from, smallGifUrl).then(() => {
                                client.reply(from, 'Here\'s your sticker')
                                console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                            }).catch((err) => console.log(err))
                        } else if (isMediaGiphy) {
                            const gifUrl = url.match(new RegExp(/(giphy|source).(gif|mp4)/, 'gi'))
                            if (!gifUrl) { return client.reply(from, 'Gagal mengambil kode giphy', id) }
                            const smallGifUrl = url.replace(gifUrl[0], 'giphy-downsized.gif')
                            client.sendGiphyAsSticker(from, smallGifUrl)
                                .then(() => {
                                    client.reply(from, 'Here\'s your sticker')
                                    console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                                })
                                .catch(() => {
                                    client.reply(from, resMsg.error.norm, id)
                                })
                        } else {
                            await client.reply(from, 'Maaf, command sticker giphy hanya bisa menggunakan link dari giphy.  [Giphy Only]', id)
                        }
                        break

                    case 'qr':
                    case 'qrcode':
                        if (args.length == 0) return client.reply(from, `Untuk membuat kode QR, ketik ${prefix}qrcode <kata>\nContoh:  ${prefix}qrcode nama saya SeroBot`, id)
                        client.reply(from, resMsg.wait, id);
                        await client.sendFileFromUrl(from, `http://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(arg)}&size=500x500`, id)
                        break

                    case 'meme':
                    case 'memefy':
                        if ((isMedia || isQuotedImage) && args.length >= 2) {
                            try {
                                const top = arg.split('|')[0]
                                const bottom = arg.split('|')[1]
                                const encryptMedia = isQuotedImage ? quotedMsg : message
                                const mediaData = await decryptMedia(encryptMedia)
                                const getUrl = await uploadImages(mediaData, false)
                                const ImageBase64 = await meme.custom(getUrl, top, bottom)
                                client.sendFile(from, ImageBase64, 'image.png', '', null, true)
                                    .then(() => {
                                        client.reply(from, 'Here you\'re!', id)
                                    })
                                    .catch(() => {
                                        client.reply(from, resMsg.error.norm)
                                    })
                            } catch (err) {
                                console.log(err)
                                await client.reply(from, `Argumen salah, Silahkan kirim gambar dengan caption ${prefix}memefy <teks_atas> | <teks_bawah>\ncontoh: ${prefix}memefy ini teks atas | ini teks bawah`, id)
                            }

                        } else {
                            await client.reply(from, `Tidak ada gambar! Silahkan kirim gambar dengan caption ${prefix}memefy <teks_atas> | <teks_bawah>\ncontoh: ${prefix}memefy ini teks atas | ini teks bawah`, id)
                        }
                        break

                    case 'nulis':
                        if (args.length == 0 && !isQuotedChat) return client.reply(from, `Membuat bot menulis teks yang dikirim menjadi gambar\nPemakaian: ${prefix}nulis [teks]\n\ncontoh: ${prefix}nulis i love you 3000`, id)
                        const nulisq = isQuotedChat ? quotedMsgObj.content.toString() : body.slice(7)
                        const nulisp = await api.tulis(nulisq)
                        await client.sendImage(from, `${nulisp}`, '', 'Nih...', id)
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break

                    //required to install libreoffice
                    case 'doctopdf':
                    case 'pdf':
                        if (!isQuotedDocs) return client.reply(from, `Convert doc/docx to pdf.\n\nKirim dokumen kemudian reply dokumen dengan ${prefix}pdf`, id)
                        if (/\.docx|\.doc/g.test(quotedMsg.filename) && isQuotedDocs) {
                            client.sendText(from, resMsg.wait)
                            const encDocs = await decryptMedia(quotedMsg)
                            toPdf(encDocs).then(
                                (pdfBuffer) => {
                                    fs.writeFileSync("./media/result.pdf", pdfBuffer)

                                    client.sendFile(from, "./media/result.pdf", quotedMsg.filename.replace(/\.docx|\.doc/g, '.pdf'))
                                }, (err) => {
                                    console.log(err)
                                    client.sendText(from, resMsg.error.norm)
                                }
                            )
                        } else {
                            client.reply(from, 'Maaf format file tidak sesuai', id)
                        }
                        break

                    //Islam Command
                    case 'listsurah':
                        try {
                            axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                                .then((response) => {
                                    let listsrh = '??????????????? List Surah ??????\n'
                                    for (let i = 0; i < response.data.data.length; i++) {
                                        listsrh += `?????? `
                                        listsrh += response.data.data[i].name.transliteration.id.toLowerCase() + '\n'
                                    }
                                    listsrh += '????????? *SeroBot* ???'
                                    client.reply(from, listsrh, id)
                                })
                        } catch (err) {
                            client.reply(from, err, id)
                        }
                        break
                    case 'infosurah':
                        if (args.length == 0) return client.reply(from, `*_${prefix}infosurah <nama surah>_*\nMenampilkan informasi lengkap mengenai surah tertentu. Contoh penggunan: ${prefix}infosurah al-baqarah`, message.id)
                        var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                            .catch(err => {
                                console.log(err)
                                client.sendText(from, resMsg.error.norm)
                            })
                        var { data } = responseh.data
                        var idx = data.findIndex(function (post, index) {
                            if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                                return true;
                        });
                        if (data[idx] === undefined) return client.reply(from, `Maaf format salah`, id)
                        var pesan = ""
                        pesan = pesan + "Nama : " + data[idx].name.transliteration.id + "\n" + "Asma : " + data[idx].name.short + "\n" + "Arti : " + data[idx].name.translation.id + "\n" + "Jumlah ayat : " + data[idx].numberOfVerses + "\n" + "Nomor surah : " + data[idx].number + "\n" + "Jenis : " + data[idx].revelation.id + "\n" + "Keterangan : " + data[idx].tafsir.id
                        client.reply(from, pesan, message.id)
                        break

                    case 'surah':
                        if (args.length == 0) return client.reply(from, `*_${prefix}surah <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1\n\n*_${prefix}surah <nama surah> <ayat> en/id_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Inggris / Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1 id`, message.id)
                        var responsh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                            .catch(err => {
                                console.log(err)
                                client.sendText(from, resMsg.error.norm)
                            })
                        var { data } = responsh.data
                        var idx = data.findIndex(function (post, index) {
                            if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                                return true;
                        })
                        if (data[idx] === undefined) return client.reply(from, `Maaf format salah`, id)
                        nmr = data[idx].number
                        var info = body.trim().split(' ')
                        var ayat = info[2]
                        console.log(nmr)
                        if (!isNaN(nmr)) {
                            var responseh2 = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + ayat)
                                .catch(err => {
                                    console.log(err)
                                    client.sendText(from, resMsg.error.norm)
                                })
                            if (responseh2 === undefined) return client.reply(from, `Maaf error/format salah`, id)
                            var { data } = responseh2.data
                            var last = function last(array, n) {
                                if (array == null) return void 0;
                                if (n == null) return array[array.length - 1];
                                return array.slice(Math.max(array.length - n, 0));
                            };
                            bhs = last(args)
                            pesan = ""
                            pesan = pesan + data.text.arab + "\n\n"
                            if (bhs == "en") {
                                pesan = pesan + data.translation.en
                            } else {
                                pesan = pesan + data.translation.id
                            }
                            pesan = pesan + "\n\n(Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + ")"
                            client.reply(from, pesan, message.id)
                        }
                        break

                    case 'tafsir':
                        if (args.length == 0) return client.reply(from, `*_${prefix}tafsir <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahan dan tafsirnya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}tafsir al-baqarah 1`, message.id)
                        var responsh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                            .catch(err => {
                                console.log(err)
                                client.sendText(from, resMsg.error.norm)
                            })
                        var { data } = responsh.data
                        var idx = data.findIndex(function (post, index) {
                            if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                                return true;
                        });
                        if (data[idx] === undefined) return client.reply(from, `Maaf format salah`, id)
                        nmr = data[idx].number
                        if (!isNaN(nmr)) {
                            var responsih = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + args[1])
                            var { data } = responsih.data
                            pesan = ""
                            pesan = pesan + "Tafsir Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + "\n\n"
                            pesan = pesan + data.text.arab + "\n\n"
                            pesan = pesan + "_" + data.translation.id + "_" + "\n\n" + data.tafsir.id.long
                            client.reply(from, pesan, message.id)
                        }
                        break

                    case 'alaudio':
                        if (args.length == 0) return client.reply(from, `*_${prefix}ALaudio <nama surah>_*\nMenampilkan tautan dari audio surah tertentu. Contoh penggunaan : ${prefix}ALaudio al-fatihah\n\n*_${prefix}ALaudio <nama surah> <ayat>_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1\n\n*_${prefix}ALaudio <nama surah> <ayat> en_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Inggris. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1 en`, message.id)
                        ayat = "ayat"
                        bhs = ""
                        var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                            .catch(err => {
                                console.log(err)
                                client.sendText(from, resMsg.error.norm)
                            })
                        var surah = responseh.data
                        var idx = surah.data.findIndex(function (post, index) {
                            if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                                return true;
                        });
                        if (surah.data[idx] === undefined) return client.reply(from, `Maaf format salah`, id)
                        nmr = surah.data[idx].number
                        if (!isNaN(nmr)) {
                            if (args.length > 2) {
                                ayat = args[1]
                            }
                            if (args.length == 2) {
                                var last = function last(array, n) {
                                    if (array == null) return void 0;
                                    if (n == null) return array[array.length - 1];
                                    return array.slice(Math.max(array.length - n, 0));
                                };
                                ayat = last(args)
                            }
                            pesan = ""
                            if (isNaN(ayat)) {
                                var responsih2 = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah/' + nmr + '.json')
                                    .catch(err => {
                                        console.log(err)
                                        client.sendText(from, resMsg.error.norm)
                                    })
                                var { name, name_translations, number_of_ayah, number_of_surah, recitations } = responsih2.data
                                pesan = pesan + "Audio Quran Surah ke-" + number_of_surah + " " + name + " (" + name_translations.ar + ") " + "dengan jumlah " + number_of_ayah + " ayat\n"
                                pesan = pesan + "Dilantunkan oleh " + recitations[0].name + " : " + recitations[0].audio_url + "\n"
                                pesan = pesan + "Dilantunkan oleh " + recitations[1].name + " : " + recitations[1].audio_url + "\n"
                                pesan = pesan + "Dilantunkan oleh " + recitations[2].name + " : " + recitations[2].audio_url + "\n"
                                client.reply(from, pesan, message.id)
                            } else {
                                var responsih2 = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + ayat)
                                    .catch(err => {
                                        console.log(err)
                                        client.sendText(from, resMsg.error.norm)
                                    })
                                var { data } = responsih2.data
                                var last = function last(array, n) {
                                    if (array == null) return void 0;
                                    if (n == null) return array[array.length - 1];
                                    return array.slice(Math.max(array.length - n, 0));
                                };
                                bhs = last(args)
                                pesan = ""
                                pesan = pesan + data.text.arab + "\n\n"
                                if (bhs == "en") {
                                    pesan = pesan + data.translation.en
                                } else {
                                    pesan = pesan + data.translation.id
                                }
                                pesan = pesan + "\n\n(Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + ")"
                                await client.sendFileFromUrl(from, data.audio.secondary[0])
                                await client.reply(from, pesan, message.id)
                            }
                        }
                        break

                    case 'jsholat':
                    case 'jsolat':
                        if (args.length === 0) return client.reply(from, `ketik *${prefix}jsholat <nama kabupaten>* untuk melihat jadwal sholat\nContoh: *${prefix}jsholat sleman*\nUntuk melihat daftar daerah, ketik *${prefix}jsholat daerah*`, id)
                        if (args[0] == 'daerah') {
                            var datad = await axios.get('https://api.banghasan.com/sholat/format/json/kota')
                                .catch(err => {
                                    console.log(err)
                                    client.sendText(from, resMsg.error.norm)
                                })
                            var datas = datad.data.kota
                            let hasil = '??????????????? Daftar Kota ??????\n'
                            for (let i = 0; i < datas.length; i++) {
                                var kota = datas[i].nama
                                hasil += '?????? '
                                hasil += `${kota}\n`
                            }
                            hasil += '????????? *SeroBot* ???'
                            await client.reply(from, hasil, id)
                        } else {
                            var datak = await axios.get('https://api.banghasan.com/sholat/format/json/kota/nama/' + args[0])
                                .catch(err => {
                                    console.log(err)
                                    client.sendText(from, resMsg.error.norm)
                                })
                            try {
                                var kodek = datak.data.kota[0].id
                            } catch (err) {
                                return client.reply(from, 'Kota tidak ditemukan', id)
                            }
                            var tgl = moment(t * 1000).format('YYYY-MM-DD')
                            var datas = await axios.get('https://api.banghasan.com/sholat/format/json/jadwal/kota/' + kodek + '/tanggal/' + tgl)
                            var jadwals = datas.data.jadwal.data
                            let jadwal = `??????????????? Jadwal Sholat di ${args[0]} ??????\n`
                            jadwal += `?????? Imsak      : ` + jadwals.imsak + '\n'
                            jadwal += `?????? Subuh      : ` + jadwals.subuh + '\n'
                            jadwal += `?????? Dzuhur    : ` + jadwals.dzuhur + '\n'
                            jadwal += `?????? Ashar       : ` + jadwals.ashar + '\n'
                            jadwal += `?????? Maghrib  : ` + jadwals.maghrib + '\n'
                            jadwal += `?????? Isya'         : ` + jadwals.isya + '\n'
                            jadwal += '????????? *SeroBot Bot* ???'
                            client.reply(from, jadwal, id)
                        }
                        break
                    //Group All User
                    case 'grouplink':
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (isGroupMsg) {
                            const inviteLink = await client.getGroupInviteLink(groupId)
                            client.sendLinkWithAutoPreview(from, inviteLink, `\nLink group *${name}* Gunakan *${prefix}revoke* untuk mereset Link group`)
                        } else {
                            client.reply(from, resMsg.error.group, id)
                        }
                        break
                    case "revoke":
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (isBotGroupAdmins) {
                            client.revokeGroupInviteLink(from)
                                .then((res) => {
                                    client.reply(from, `Berhasil Revoke Grup Link gunakan *${prefix}grouplink* untuk mendapatkan group invite link yang terbaru`, id)
                                })
                                .catch((err) => {
                                    console.log(`[ERR] ${err}`)
                                });
                        }
                        break

                    //Media
                    case 'ytmp3':
                        if (args.length == 0) return client.reply(from, `Untuk mendownload lagu dari youtube\nketik: ${prefix}ytmp3 <link yt>`, id)
                        if (arg.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/) === null) return client.reply(from, `Link youtube tidak valid.`, id)
                        client.sendText(from, resMsg.wait)
                        const ytid = args[0].substr((args[0].indexOf('=')) !== -1 ? (args[0].indexOf('=') + 1) : (args[0].indexOf('be/') + 3))
                        try {
                            var time = moment(t * 1000).format('mmss')
                            var path = `./media/temp_${time}.mp3`

                            stream = ytdl(ytid)

                            ffmpeg({source:stream})
                                .setFfmpegPath('./bin/ffmpeg')
                                .on('error', (err) => {
                                    console.log('An error occurred: ' + err.message)
                                    client.reply(from, resMsg.error.norm, id)
                                  })
                                .on('end', () => {
                                    client.sendPtt(from, path, id).then(console.log(`Audio Processed for ${processTime(t, moment())} Second`))
                                    fs.unlinkSync(path)
                                  })
                                .saveToFile(path)
                        }catch (err){
                            console.log(err)
                            client.reply(from, resMsg.error.norm, id)
                        }
                        break

                    case 'play': //silahkan kalian custom sendiri jika ada yang ingin diubah
                        if (args.length == 0) return client.reply(from, `Untuk mencari lagu dari youtube\n\nPenggunaan: ${prefix}play <judul lagu>\nContoh: ${prefix}play radioactive but im waking up`, id)
                        let ytresult = await api.ytsearch(arg).catch(err => {
                            console.log(err)
                            return client.reply(from, resMsg.error.norm, id)
                        })

                        if (ytresult === undefined) return client.reply(from, resMsg.error.norm, id)

                        try {
                            let duration = (ytresult) => {
                                const n = ytresult.duration.split(':')
                                if (n.length === 3) return parseInt(n[0]) * 3600 + parseInt(n[1]) * 60 + parseInt(n[2])
                                    else return parseInt(n[0] * 60) + parseInt(n[1])
                            }
                            if (duration(ytresult) > 600) return client.reply(from, `Error. Durasi video lebih dari 10 menit!`, id)
                                var estimasi = duration(ytresult) / 100
                                var est = estimasi.toFixed(0)

                            await client.sendFileFromUrl(from, `${ytresult.thumbnail}`, ``, `Video ditemukan\n\nJudul: ${ytresult.judul}\nDurasi: ${ytresult.duration}\nUploaded: ${ytresult.published_at}\nView: ${ytresult.views}\n\nAudio sedang dikirim ?? ${est} menit`, id)
 
                            //Download video and save as MP3 file
                            var time = moment(t * 1000).format('mmss')
                            var path = `./media/temp_${time}.mp3`

                            stream = ytdl(ytresult.id)
                            ffmpeg({source:stream})
                                .setFfmpegPath('./bin/ffmpeg')
                                .on('error', (err) => {
                                    console.log('An error occurred: ' + err.message)
                                    return client.reply(from, resMsg.error.norm, id)
                                  })
                                .on('end', () => {
                                    client.sendPtt(from, path, id).then(console.log(`Audio Processed for ${processTime(t, moment())} Second`))
                                    fs.unlinkSync(path)
                                  })
                                .saveToFile(path)

                        }catch (err){
                            console.log(err)
                            client.reply(from, resMsg.error.norm, id)
                        }
                        break

                    case 'artinama':
                        if (args.length == 0) return client.reply(from, `Untuk mengetahui arti nama seseorang\nketik ${prefix}artinama namakamu`, id)
                        api.artinama(body.slice(10))
                            .then(async (res) => {
                                await client.reply(from, `Arti : ${res}`, id)
                            })
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break

                    // Random Kata
                    case 'fakta':
                        fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/faktaunix.txt')
                            .then(res => res.text())
                            .then(body => {
                                let splitnix = body.split('\n')
                                let randomnix = _.sample(splitnix)
                                client.reply(from, randomnix, id)
                            })
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break
                    case 'katabijak':
                        fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/katabijax.txt')
                            .then(res => res.text())
                            .then(body => {
                                let splitbijak = body.split('\n')
                                let randombijak = _.sample(splitbijak)
                                client.reply(from, randombijak, id)
                            })
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break
                    case 'pantun':
                        fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/pantun.txt')
                            .then(res => res.text())
                            .then(body => {
                                let splitpantun = body.split('\n')
                                let randompantun = _.sample(splitpantun)
                                client.reply(from, ' ' + randompantun.replace(/aruga-line/g, "\n"), id)
                            })
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break
                    case 'quote':
                    case 'quotes':
                        const quotex = await api.quote()
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        await client.reply(from, quotex, id)
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break

                    //Random Images
                    case 'anime':
                        if (args.length == 0) return client.reply(from, `Untuk menggunakan ${prefix}anime\nSilahkan ketik: ${prefix}anime [query]\nContoh: ${prefix}anime random\n\nquery yang tersedia:\nrandom, waifu, husbu, neko`, id)
                        if (args[0] == 'random' || args[0] == 'waifu' || args[0] == 'husbu' || args[0] == 'neko') {
                            fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/anime/' + args[0] + '.txt')
                                .then(res => res.text())
                                .then(body => {
                                    let randomnime = body.split('\n')
                                    let randomnimex = _.sample(randomnime)
                                    client.sendFileFromUrl(from, randomnimex, '', 'Nee..', id)
                                })
                                .catch(() => {
                                    client.reply(from, resMsg.error.norm, id)
                                })
                        } else {
                            client.reply(from, `Maaf query tidak tersedia. Silahkan ketik ${prefix}anime untuk melihat list query`)
                        }
                        break
                    case 'kpop':
                        if (args.length == 0) return client.reply(from, `Untuk menggunakan ${prefix}kpop\nSilahkan ketik: ${prefix}kpop [query]\nContoh: ${prefix}kpop bts\n\nquery yang tersedia:\nblackpink, exo, bts`, id)
                        if (args[0] == 'blackpink' || args[0] == 'exo' || args[0] == 'bts') {
                            fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/kpop/' + args[0] + '.txt')
                                .then(res => res.text())
                                .then(body => {
                                    let randomkpop = body.split('\n')
                                    let randomkpopx = _.sample(randomkpop)
                                    client.sendFileFromUrl(from, randomkpopx, '', 'Nee..', id)
                                })
                                .catch(() => {
                                    client.reply(from, resMsg.error.norm, id)
                                })
                        } else {
                            client.reply(from, `Maaf query tidak tersedia. Silahkan ketik ${prefix}kpop untuk melihat list query`)
                        }
                        break
                    case 'memes':
                        const randmeme = await meme.random()
                        client.sendFileFromUrl(from, randmeme, '', '', id)
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break

                    // Search Any

                    case 'pin':
                    case 'image':
                    case 'images':
                        if (args.length == 0) return client.reply(from, `Untuk mencari gambar dari pinterest\nketik: ${prefix}images [search]\ncontoh: ${prefix}images naruto`, id)
                        var result = false
                        do {
                            await images.fdci(arg)
                                .then(res => result = res)
                                .catch(e => {
                                    console.log(`fdci err : ${e}`)
                                    return client.reply(from, resMsg.error.norm, id)
                                })
                        } while (result == undefined || result == null)
                        if (result != false) {
                            await client.sendFileFromUrl(from, result, '', '', id)
                                .catch(() => {
                                    return client.reply(from, resMsg.error.norm, id)
                                })
                        }
                        break

                    case 'crjogja':
                        const url1 = 'http://api.screenshotlayer.com/api/capture?access_key=f56691eb8b1edb4062ed146cccaef885&url=https://sipora.staklimyogyakarta.com/radar/&viewport=600x600&width=600&force=1'
                        const url2 = 'https://screenshotapi.net/api/v1/screenshot?token=FREB5SDBA2FRMO4JDMSHXAEGNYLKYCA4&url=https%3A%2F%2Fsipora.staklimyogyakarta.com%2Fradar%2F&width=600&height=600&fresh=true&output=image'
                        const isTrue1 = Boolean(Math.round(Math.random()))
                        const url = isTrue1 ? url1 : url2

                        await client.sendText(from, 'Gotcha, please wait!')
                        await client.simulateTyping(from, true)
                        await client.sendFileFromUrl(from, url, '', 'Captured from https://sipora.staklimyogyakarta.com/radar/')
                            .then(() => {
                                client.simulateTyping(from, false)
                            })
                            .catch(() => {
                                client.reply(from, 'Ada yang error! Coba lagi beberapa saat kemudian. Mending cek sendiri aja ke\nhttps://sipora.staklimyogyakarta.com/radar/', id)
                            })
                        break

                    case 'sreddit':
                        if (args.length == 0) return client.reply(from, `Untuk mencari gambar dari sub reddit\nketik: ${prefix}sreddit [search]\ncontoh: ${prefix}sreddit naruto`, id)
                        const carireddit = body.slice(9)
                        const hasilreddit = await images.sreddit(carireddit)
                        await client.sendFileFromUrl(from, hasilreddit, '', '', id)
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break
                    case 'nekopoi':
                        if (isGroupMsg) {
                            client.reply(from, 'Untuk Fitur Nekopoi Silahkan Lakukan di Private Message', id)
                        } else {
                            var data = await axios.get('https://api.arugaz.my.id/api/anime/nekopoi/random')
                            var x = Math.floor((Math.random() * 7) + 0);
                            var poi = data.data[x]
                            console.log(poi)
                            let hasilpoi = 'Note[???]: 18+ ONLY[???]'
                            hasilpoi += '\nJudul: ' + poi.title
                            hasilpoi += '\nLink: ' + poi.link
                            client.reply(from, hasilpoi, id)
                        }

                        break
                    case 'cuaca':
                        if (args.length == 0) return client.reply(from, `Untuk melihat cuaca pada suatu daerah\nketik: ${prefix}cuaca [daerah]`, id)
                        const cuacaq = body.slice(7)
                        const cuacap = await api.cuaca(cuacaq)
                        await client.reply(from, cuacap, id)
                            .catch(() => {
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break

                    case 'whatanime':
                        if (isMedia && type === 'image' || quotedMsg && quotedMsg.type === 'image') {
                            if (isMedia) {
                                var mediaData = await decryptMedia(message)
                            } else {
                                var mediaData = await decryptMedia(quotedMsg)
                            }
                            const imgBS4 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                            client.reply(from, 'Searching....', id)
                            fetch('https://trace.moe/api/search', {
                                method: 'POST',
                                body: JSON.stringify({ image: imgBS4 }),
                                headers: { "Content-Type": "application/json" }
                            })
                                .then(respon => respon.json())
                                .then(resolt => {
                                    if (resolt.docs && resolt.docs.length <= 0) {
                                        client.reply(from, 'Maaf, saya tidak tau ini anime apa, pastikan gambar yang akan di Search tidak Buram/Kepotong', id)
                                    }
                                    const { is_adult, title, title_chinese, title_romaji, title_english, episode, similarity, filename, at, tokenthumb, anilist_id } = resolt.docs[0]
                                    teks = ''
                                    if (similarity < 0.92) {
                                        teks = '*Saya memiliki keyakinan rendah dalam hal ini* :\n\n'
                                    }
                                    teks += `??? *Title Japanese* : ${title}\n??? *Title chinese* : ${title_chinese}\n??? *Title Romaji* : ${title_romaji}\n??? *Title English* : ${title_english}\n`
                                    teks += `??? *R-18?* : ${is_adult}\n`
                                    teks += `??? *Eps* : ${episode.toString()}\n`
                                    teks += `??? *Kesamaan* : ${(similarity * 100).toFixed(1)}%\n`
                                    var video = `https://media.trace.moe/video/${anilist_id}/${encodeURIComponent(filename)}?t=${at}&token=${tokenthumb}`;
                                    client.sendFileFromUrl(from, video, 'anime.mp4', teks, id).catch(() => {
                                        client.reply(from, teks, id)
                                    })
                                })
                                .catch(err => {
                                    console.log(err)
                                    client.reply(from, resMsg.error.norm, id)
                                })
                        } else {
                            client.reply(from, `Maaf format salah\n\nSilahkan kirim foto dengan caption ${prefix}whatanime\n\nAtau reply foto dengan caption ${prefix}whatanime`, id)
                        }
                        break

                    case 'tod':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        client.reply(from, `Sebelum bermain berjanjilah akan melaksanakan apapun perintah yang diberikan.\n\nSilahkan Pilih:\n-> ${prefix}truth\n-> ${prefix}dare`, id)
                        break
                    case 'truth':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        fetch('https://raw.githubusercontent.com/AlvioAdjiJanuar/random/main/truth.txt')
                            .then(res => res.text())
                            .then(body => {
                                let truthx = body.split('\n')
                                let truthz = _.sample(truthx)
                                client.reply(from, truthz, id)
                            })
                            .catch((err) => {
                                console.log(err)
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break
                    case 'dare':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        fetch('https://raw.githubusercontent.com/AlvioAdjiJanuar/random/main/dare.txt')
                            .then(res => res.text())
                            .then(body => {
                                let darex = body.split('\n')
                                let darez = _.sample(darex)
                                client.reply(from, darez, id)
                            })
                            .catch((err) => {
                                console.log(err)
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break
                    // Other Command
                    case 'resi':
                        if (args.length !== 2) return client.reply(from, `Maaf, format pesan salah.\nSilahkan ketik pesan dengan ${prefix}resi <kurir> <no_resi>\n\nKurir yang tersedia:\njne, pos, tiki, wahana, jnt, rpx, sap, sicepat, pcp, jet, dse, first, ninja, lion, idl, rex`, id)
                        const kurirs = ['jne', 'pos', 'tiki', 'wahana', 'jnt', 'rpx', 'sap', 'sicepat', 'pcp', 'jet', 'dse', 'first', 'ninja', 'lion', 'idl', 'rex']
                        if (!kurirs.includes(args[0])) return client.sendText(from, `Maaf, jenis ekspedisi pengiriman tidak didukung layanan ini hanya mendukung ekspedisi pengiriman ${kurirs.join(', ')} Tolong periksa kembali.`)
                        console.log('Memeriksa No Resi', args[1], 'dengan ekspedisi', args[0])
                        cekResi(args[0], args[1]).then((result) => client.sendText(from, result))
                        break

                    case 'tts':
                    case 'say':
                        if (!isQuotedChat && args.length !== 0) {
                            try {
                                const dataText = body.slice(8)
                                if (dataText === '') return client.reply(from, 'Apa teksnya syg..', id)
                                var gtts = new gTTS(dataText, args[0])
                                gtts.save('./media/tts.mp3', function () {
                                    client.sendPtt(from, './media/tts.mp3', id)
                                        .catch(err => {
                                            console.log(err)
                                            client.sendTest(from, resMsg.error.norm)
                                        })
                                })
                            } catch (err) {
                                console.log(err.name)
                                client.reply(from, err.name + '! ' + err.message + '\nUntuk kode bahasa cek disini : https://anotepad.com/note/read/7fd833h4', id)
                            }
                        }
                        else if (isQuotedChat && args.length !== 0) {
                            try {
                                const dataText = quotedMsgObj.content.toString()
                                var gtts = new gTTS(dataText, args[0])
                                gtts.save('./media/tts.mp3', function () {
                                    client.sendPtt(from, './media/tts.mp3', quotedMsgObj.id)
                                        .catch(err => {
                                            console.log(err)
                                            client.sendTest(from, resMsg.error.norm)
                                        })
                                })
                            } catch (err) {
                                console.log(err)
                                client.reply(from, err.name + '! ' + err.message + '\nUntuk kode bahasa cek disini : https://anotepad.com/note/read/7fd833h4', id)
                            }
                        }
                        else {
                            await client.reply(from, `Mengubah teks menjadi sound (google voice)\nketik: ${prefix}tts <kode_bahasa> <teks>\ncontoh : ${prefix}tts id halo\nuntuk kode bahasa cek disini : https://anotepad.com/note/read/7fd833h4`, id)
                        }
                        break

                    case 'ceklokasi':
                        if (!isQuotedLocation) return client.reply(from, `Maaf, format pesan salah.\nKirimkan lokasi dan reply dengan caption ${prefix}ceklokasi`, id)

                        client.reply(from, 'Okey sebentar...', id)
                        console.log(`Request Status Zona Penyebaran Covid-19 (${quotedMsg.lat}, ${quotedMsg.lng}).`)
                        const zoneStatus = await getLocationData(quotedMsg.lat, quotedMsg.lng)
                        if (zoneStatus.kode !== 200) client.sendText(from, 'Maaf, Terjadi error ketika memeriksa lokasi yang anda kirim.')
                        let datax = ''
                        for (let i = 0; i < zoneStatus.data.length; i++) {
                            const { zone, region } = zoneStatus.data[i]
                            const _zone = zone == 'green' ? 'Hijau* (Aman) \n' : zone == 'yellow' ? 'Kuning* (Waspada) \n' : 'Merah* (Bahaya) \n'
                            datax += `${i + 1}. Kel. *${region}* Berstatus *Zona ${_zone}`
                        }
                        const text = `*CEK LOKASI PENYEBARAN COVID-19*\nHasil pemeriksaan dari lokasi yang anda kirim adalah *${zoneStatus.status}* ${zoneStatus.optional}\n\nInformasi lokasi terdampak disekitar anda:\n${datax}`
                        client.sendText(from, text)
                        break

                    case 'shortlink':
                        if (args.length == 0) return client.reply(from, `ketik ${prefix}shortlink <url>`, id)
                        if (!isUrl(args[0])) return client.reply(from, 'Maaf, url yang kamu kirim tidak valid. Pastikan menggunakan format http/https', id)
                        const shortlink = await urlShortener(args[0])
                        await client.sendText(from, shortlink)
                            .catch((err) => {
                                console.log(err)
                                client.reply(from, resMsg.error.norm, id)
                            })
                        break

                    case 'hilih':
                        if (args.length !== 0 || isQuotedChat) {
                            const _input = isQuotedChat ? quotedMsgObj.content.toString() : body.slice(7)
                            const _id = isQuotedChat ? quotedMsgObj.id : id
                            const _res = _input.replace(/[aiueo]/g, 'i')
                            client.reply(from, _res, _id)
                        }
                        else {
                            await client.reply(from, `Mengubah kalimat menjadi hilih gitu deh\n\nketik ${prefix}hilih kalimat\natau reply chat menggunakan ${prefix}hilih`, id)
                        }
                        break

                    case 'klasemen':
                    case 'klasmen':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isNgegas) return client.reply(from, `Anti-Toxic tidak aktif, aktifkan menggunakan perintah ${prefix}kasar on`, id)
                        try{
                            const klasemen = db.get('group').filter({ id: groupId }).map('members').value()[0]
                            let urut = Object.entries(klasemen).map(([key, val]) => ({ id: key, ...val })).sort((a, b) => b.denda - a.denda);
                            let textKlas = "*Klasemen Denda Sementara*\n"
                            let i = 1;
                            urut.forEach((klsmn) => {
                                textKlas += i + ". @" + klsmn.id.replace('@c.us', '') + " ??? Rp" + formatin(klsmn.denda) + "\n"
                                i++
                            })
                            await client.sendTextWithMentions(from, textKlas)
                        }catch (err) {
                            console.log(err)
                            client.reply(from, resMsg.error.norm, id)
                        }
                        break

                    case 'skripsi':
                        let randomSkripsi = _.sample(skripsi)
                        var gtts = new gTTS(randomSkripsi, 'id')
                        try {
                            gtts.save('./media/tts.mp3', function () {
                                client.sendPtt(from, './media/tts.mp3', id)
                                    .catch(err => {
                                        console.log(err)
                                        client.sendTest(from, resMsg.error.norm)
                                    })
                            })
                        } catch (err) {
                            console.log(err)
                            client.reply(from, resMsg.error.norm, id)
                        }
                        break

                    case 'apakah':
                        const isTrue = Boolean(Math.round(Math.random()))
                        var result = ''
                        if (args.length === 0) result = 'Apakah apa woy yang jelas dong! Misalnya, apakah aku ganteng?'
                        else {
                            result = isTrue ? 'Iya' : 'Tidak'
                        }
                        var gtts = new gTTS(result, 'id')
                        try {
                            gtts.save('./media/tts.mp3', function () {
                                client.sendPtt(from, './media/tts.mp3', id)
                                    .catch(err => {
                                        console.log(err)
                                        client.sendTest(from, resMsg.error.norm)
                                    })
                            })
                        } catch (err) {
                            console.log(err)
                            client.reply(from, resMsg.error.norm, id)
                        }
                        break

                    case 'kbbi':
                        if (args.length !== 1) return client.reply(from, `Mencari arti kata dalam KBBI\nPenggunaan: ${prefix}kbbi <kata>\ncontoh: ${prefix}kbbi apel`, id)
                        const cariKata = kbbi(args[0])
                            .then(res => {
                                if (res == '') return client.reply(from, `Maaf kata "${args[0]}" tidak tersedia di KBBI`, id)
                                client.reply(from, res + `\n\nMore: https://kbbi.web.id/${args[0]}`, id)

                            }).catch(err => {
                                client.reply(from, resMsg.error.norm, id)
                                console.log(err)
                            })
                        break

                    case 'trans':
                    case 'translate':
                        if (args.length === 0 && !isQuotedChat) return client.reply(from, `Translate text ke kode bahasa, penggunaan: ${prefix}trans <kode bahasa> <text>\nContoh : ${prefix}trans id some english/other language text here\n${prefix}translate en beberapa kata bahasa indonesia atau bahasa lain. \nUntuk kode bahasa cek disini : https://anotepad.com/note/read/7fd833h4`, id)
                        const lang = ['en','pt','af','sq','am','ar','hy','az','eu','be','bn','bs','bg','ca','ceb','ny','zh-CN','co','hr','cs','da','nl','eo','et','tl','fi','fr','fy','gl','ka','de','el','gu','ht','ha','haw','iw','hi','hmn','hu','is','ig','id','ga','it','ja','jw','kn','kk','km','rw','ko','ku','ky','lo','la','lv','lt','lb','mk','mg','ms','ml','mt','mi','mr','mn','my','ne','no','or','ps','fa','pl','pa','ro','ru','sm','gd','sr','st','sn','sd','si','sk','sl','so','es','su','sw','sv','tg','ta','tt','te','th','tr','tk','uk','ur','ug','uz','vi','cy','xh','yi','yo','zu','zh-TW']

                        if (lang.includes(args[0])) {
                            translate(isQuotedChat ? quotedMsgObj.content.toString() : arg.trim().substring(arg.indexOf(' ') + 1), {
                             from: 'auto', to: args[0] }).then(n => {
                                client.reply(from, n, id)
                            }).catch(err => {
                                console.log(err)
                                client.reply(from, resMsg.error.norm, id)
                            })
                        }else{
                            client.reply(from, `Kode bahasa tidak valid`, id)
                        }
                        break

                    // List creator commands
                    case 'list':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (args.length === 0) {
                            let thelist = await list.getListName(groupId)
                            client.reply(from, `${(thelist === false || thelist === '') ? 'Group ini belum memiliki list.' : `List yang ada di group: ${thelist.join(', ')}`}\n\nMenampilkan list/daftar yang tersimpan di database bot untuk group ini.\nPenggunaan: *${prefix}list <nama list>*
                                \nUntuk membuat list gunakan perintah:\n *${prefix}createlist <nama list>* contoh: ${prefix}createlist tugas (mohon hanya gunakan 1 kata untuk nama list)
                                \nUntuk menghapus list beserta isinya gunakan perintah:\n *${prefix}deletelist <nama list>* contoh: ${prefix}deletelist tugas
                                \nUntuk mengisi list gunakan perintah:\n *${prefix}addtolist <nama list> <isi>* bisa lebih dari 1 menggunakan pemisah | \ncontoh: ${prefix}addtolist tugas Matematika Bab 1 deadline 2021 | Pengantar Akuntansi Bab 2
                                \nUntuk menghapus *isi* list gunakan perintah:\n *${prefix}delist <nama list> <nomor isi list>*\nBisa lebih dari 1 menggunakan pemisah comma (,) contoh: ${prefix}delist tugas 1, 2, 3
                                `, id)
                        } else if (args.length > 0) {
                            let listData = await list.getListData(groupId, args[0])
                            if (listData === false) return client.reply(from, `List tidak ada, silakan buat dulu. \nGunakan perintah: *${prefix}createlist ${args[0]}* (mohon hanya gunakan 1 kata untuk nama list)`, id)
                            let respon = `??????????????? List ${args[0].replace(/^\w/, (c) => c.toUpperCase())} ??????\n???\n`
                            listData.forEach((data, i) => {
                                respon += `??? ${i + 1}. ${data}\n`
                            })
                            respon += '???\n????????? *SeroBot* ???'
                            await client.reply(from, respon, id)
                        }
                        break

                    case 'createlist':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (args.length === 0) return client.reply(from, `Untuk membuat list gunakan perintah: *${prefix}createlist <nama list>* contoh: ${prefix}createlist tugas (mohon hanya gunakan 1 kata untuk nama list)`, id)
                        const respon = await list.createList(groupId, args[0])
                        await client.reply(from, (respon === false) ? `List ${args[0]} sudah ada, gunakan nama lain.` : `List ${args[0]} berhasil dibuat.`, id)
                        break

                    case 'deletelist':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (args.length === 0) return client.reply(from, `Untuk menghapus list beserta isinya gunakan perintah: *${prefix}deletelist <nama list>* contoh: ${prefix}deletelist tugas`, id)
                        const thelist = await list.getListName(groupId)
                        if (thelist.includes(args[0])) {
                            client.reply(from, `[???] List ${args[0]} akan dihapus.\nKirim *${prefix}confirmdeletelist ${args[0]}* untuk mengonfirmasi, abaikan jika tidak jadi.`, id)
                        } else {
                            client.reply(from, `List ${args[0]} tidak ada.`, id)
                        }
                        break

                    case 'confirmdeletelist':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (args.length === 0) return null
                        const respon1 = await list.deleteList(groupId, args[0])
                        await client.reply(from, (respon1 === false) ? `List ${args[0]} tidak ada.` : `List ${args[0]} berhasil dihapus.`, id)
                        break

                    case 'addtolist':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (args.length === 0) return client.reply(from, `Untuk mengisi list gunakan perintah:\n *${prefix}addtolist <nama list> <isi>* Bisa lebih dari 1 menggunakan pemisah | \ncontoh: ${prefix}addtolist tugas Matematika Bab 1 deadline 2021 | Pengantar Akuntansi Bab 2`, id)
                        if (args.length === 1) return client.reply(from, `Format salah, nama dan isinya apa woy`, id)
                        const thelist1 = await list.getListName(groupId)
                        if (!thelist1.includes(args[0])) {
                            return client.reply(from, `List ${args[0]} tidak ditemukan.`, id)
                        } else {
                            let newlist = arg.substr(arg.indexOf(' ') + 1).split('|').map((item) => {
                                return item.trim()
                            })
                            const dataq = await list.addListData(groupId, args[0], newlist)
                            let respon = `??????????????? List ${args[0].replace(/^\w/, (c) => c.toUpperCase())} ??????\n???\n`
                            dataq.forEach((data, i) => {
                                respon += `??? ${i + 1}. ${data}\n`
                            })
                            respon += '???\n????????? *SeroBot* ???'
                            await client.reply(from, respon, id)
                        }
                        break

                    case 'delist':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (args.length === 0) return client.reply(from, `Untuk menghapus *isi* list gunakan perintah: *${prefix}delist <nama list> <nomor isi list>*\nBisa lebih dari 1 menggunakan pemisah comma (,) contoh: ${prefix}delist tugas 1, 2, 3`, id)
                        if (args.length === 1) return client.reply(from, `Format salah, nama list dan nomor berapa woy`, id)
                        const thelist2 = await list.getListName(groupId)
                        if (!thelist2.includes(args[0])) {
                            return client.reply(from, `List ${args[0]} tidak ditemukan.`, id)
                        }else {
                            let number = arg.substr(arg.indexOf(' ') + 1).split(',').map((item) => {
                                return item.trim()-1
                            })
                            await number.reverse().forEach(async (num) => {
                                await list.removeListData(groupId, args[0], num)
                            })
                            const data1 = await list.removeListData(groupId, args[0], 9999)
                            let respon = `??????????????? List ${args[0].replace(/^\w/, (c) => c.toUpperCase())} ??????\n???\n`
                            data1.forEach((data, i) => {
                                respon += `??? ${i + 1}. ${data}\n`
                            })
                            respon += '???\n????????? *SeroBot* ???'
                            await client.reply(from, respon, id)
                        }
                        break

                    // Group Commands (group admin only)
                    case 'add':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (args.length !== 1) return client.reply(from, `Untuk menggunakan ${prefix}add\nPenggunaan: ${prefix}add <nomor>\ncontoh: ${prefix}add 628xxx`, id)
                        try {
                            await client.addParticipant(from, `${args[0]}@c.us`)
                        } catch {
                            client.reply(from, 'Tidak dapat menambahkan target', id)
                        }
                        break

                    case 'kick':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (mentionedJidList.length === 0) return client.reply(from, 'Maaf, format pesan salah.\nSilahkan tag satu atau lebih orang yang akan dikeluarkan', id)
                        if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Maaf, format pesan salah.\nTidak dapat mengeluarkan akun bot sendiri', id)
                        await client.sendTextWithMentions(from, `Request diterima, mengeluarkan:\n${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')}`)
                        for (let i = 0; i < mentionedJidList.length; i++) {
                            if (groupAdmins.includes(mentionedJidList[i])) return await client.sendText(from, 'Gagal, kamu tidak bisa mengeluarkan admin grup.')
                            await client.removeParticipant(groupId, mentionedJidList[i])
                        }
                        break

                    case 'promote':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (mentionedJidList.length !== 1) return client.reply(from, 'Maaf, hanya bisa mempromote 1 user', id)
                        if (groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Maaf, user tersebut sudah menjadi admin.', id)
                        if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Maaf, format pesan salah.\nTidak dapat mempromote akun bot sendiri', id)
                        await client.promoteParticipant(groupId, mentionedJidList[0])
                        await client.sendTextWithMentions(from, `Request diterima, menambahkan @${mentionedJidList[0].replace('@c.us', '')} sebagai admin.`)
                        break

                    case 'demote':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (mentionedJidList.length !== 1) return client.reply(from, 'Maaf, hanya bisa mendemote 1 user', id)
                        if (!groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'Maaf, user tersebut belum menjadi admin.', id)
                        if (mentionedJidList[0] === botNumber) return await client.reply(from, 'Maaf, format pesan salah.\nTidak dapat mendemote akun bot sendiri', id)
                        await client.demoteParticipant(groupId, mentionedJidList[0])
                        await client.sendTextWithMentions(from, `Request diterima, menghapus jabatan @${mentionedJidList[0].replace('@c.us', '')}.`)
                        break

                    case 'bye':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        await client.sendText(from, 'Good bye ????')
                        await client.leaveGroup(groupId)
                        await client.deleteChat(groupId)
                        break

                    case 'del':
                        if (!quotedMsg) return client.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
                        if (!quotedMsgObj.fromMe) return client.reply(from, `Maaf, format pesan salah silahkan.\nReply pesan bot dengan caption ${prefix}del`, id)
                        await client.simulateTyping(from, false)
                        await client.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
                        break

                    case 'tagall':
                    case 'alle':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        const groupMem = await client.getGroupMembers(groupId)
                        let res = '??????????????? Mention All ??????\n'
                        for (let i = 0; i < groupMem.length; i++) {
                            res += '??????'
                            res += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
                        }
                        res += '????????? *SeroBot* ???'
                        await client.sendTextWithMentions(from, res)
                        break

                    case 'katakasar':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        client.reply(from, `Untuk mengaktifkan Fitur Kata Kasar pada Group Chat\n\nApasih kegunaan Fitur Ini? Apabila seseorang mengucapkan kata kasar akan mendapatkan denda\n\nPenggunaan\n${prefix}kasar on --mengaktifkan\n${prefix}kasar off --nonaktifkan\n\n${prefix}reset --reset jumlah denda`, id)
                        break

                    case 'kasar':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (args.length !== 1) return client.reply(from, `Untuk mengaktifkan Fitur Kata Kasar pada Group Chat\n\nApasih kegunaan Fitur Ini? Apabila seseorang mengucapkan kata kasar akan mendapatkan denda\n\nPenggunaan\n${prefix}kasar on --mengaktifkan\n${prefix}kasar off --nonaktifkan\n\n${prefix}reset --reset jumlah denda`, id)
                        if (args[0] == 'on') {
                            ngegas.push(chatId)
                            fs.writeFileSync('./data/ngegas.json', JSON.stringify(ngegas))
                            client.reply(from, 'Fitur Anti Kasar sudah di Aktifkan', id)
                        } else if (args[0] == 'off') {
                            let nixx = ngegas.indexOf(chatId)
                            ngegas.splice(nixx, 1)
                            fs.writeFileSync('./data/ngegas.json', JSON.stringify(ngegas))
                            client.reply(from, 'Fitur Anti Kasar sudah di non-Aktifkan', id)
                        } else {
                            client.reply(from, `Untuk mengaktifkan Fitur Kata Kasar pada Group Chat\n\nApasih kegunaan Fitur Ini? Apabila seseorang mengucapkan kata kasar akan mendapatkan denda\n\nPenggunaan\n${prefix}kasar on --mengaktifkan\n${prefix}kasar off --nonaktifkan\n\n${prefix}reset --reset jumlah denda`, id)
                        }
                        break

                    case 'addkasar':
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        if (args.length !== 1) { return client.reply(from, `Masukkan hanya satu kata untuk ditambahkan kedalam daftar kata kasar.\ncontoh ${prefix}addkasar jancuk`, id) }
                        else {
                            kataKasar.push(args[0])
                            fs.writeFileSync('./settings/katakasar.json', JSON.stringify(kataKasar))
                            cariKasar = requireUncached('./lib/kataKotor.js')
                            client.reply(from, `Kata ${args[0]} berhasil ditambahkan.`, id)
                        }
                        break

                    case 'reset':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        const reset = db.get('group').find({ id: groupId }).assign({ members: [] }).write()
                        if (reset) {
                            await client.sendText(from, "Klasemen telah direset.")
                        }
                        break

                    case 'mutegrup':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (args.length !== 1) return client.reply(from, `Untuk mengubah settingan group chat agar hanya admin saja yang bisa chat\n\nPenggunaan:\n${prefix}mutegrup on --aktifkan\n${prefix}mutegrup off --nonaktifkan`, id)
                        if (args[0] == 'on') {
                            client.setGroupToAdminsOnly(groupId, true).then(() => client.sendText(from, 'Berhasil mengubah agar hanya admin yang dapat chat!'))
                        } else if (args[0] == 'off') {
                            client.setGroupToAdminsOnly(groupId, false).then(() => client.sendText(from, 'Berhasil mengubah agar semua anggota dapat chat!'))
                        } else {
                            client.reply(from, `Untuk mengubah settingan group chat agar hanya admin saja yang bisa chat\n\nPenggunaan:\n${prefix}mutegrup on --aktifkan\n${prefix}mutegrup off --nonaktifkan`, id)
                        }
                        break

                    case 'setprofile':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (isMedia && type == 'image' || isQuotedImage) {
                            const dataMedia = isQuotedImage ? quotedMsg : message
                            const _mimetype = dataMedia.mimetype
                            const mediaData = await decryptMedia(dataMedia)
                            const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                            await client.setGroupIcon(groupId, imageBase64)
                        } else if (args.length === 1) {
                            if (!isUrl(url)) { await client.reply(from, 'Maaf, link yang kamu kirim tidak valid.', id) }
                            client.setGroupIconByUrl(groupId, url).then((r) => (!r && r !== undefined)
                                ? client.reply(from, 'Maaf, link yang kamu kirim tidak memuat gambar.', id)
                                : client.reply(from, 'Berhasil mengubah profile group', id))
                        } else {
                            client.reply(from, `Commands ini digunakan untuk mengganti icon/profile group chat\n\n\nPenggunaan:\n1. Silahkan kirim/reply sebuah gambar dengan caption ${prefix}setprofile\n\n2. Silahkan ketik ${prefix}setprofile linkImage`)
                        }
                        break

                    case 'welcome':
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        //if (!isGroupAdmins) return client.reply(from, resMsg.error.admin, id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        if (args.length !== 1) return client.reply(from, `Membuat BOT menyapa member yang baru join kedalam group chat!\n\nPenggunaan:\n${prefix}welcome on --aktifkan\n${prefix}welcome off --nonaktifkan`, id)
                        if (args[0] == 'on') {
                            welcome.push(chatId)
                            fs.writeFileSync('./data/welcome.json', JSON.stringify(welcome))
                            client.reply(from, 'Welcome Message sekarang diaktifkan!', id)
                        } else if (args[0] == 'off') {
                            let xporn = welcome.indexOf(chatId)
                            welcome.splice(xporn, 1)
                            fs.writeFileSync('./data/welcome.json', JSON.stringify(welcome))
                            client.reply(from, 'Welcome Message sekarang dinonaktifkan', id)
                        } else {
                            client.reply(from, `Membuat BOT menyapa member yang baru join kedalam group chat!\n\nPenggunaan:\n${prefix}welcome on --aktifkan\n${prefix}welcome off --nonaktifkan`, id)
                        }
                        break

                    //Owner Group
                    case 'kickall': //mengeluarkan semua member
                        if (!isGroupMsg) return client.reply(from, resMsg.error.group, id)
                        let isOwner = chat.groupMetadata.owner == pengirim
                        if (!isOwner) return client.reply(from, 'Maaf, perintah ini hanya dapat dipakai oleh owner grup!', id)
                        if (!isBotGroupAdmins) return client.reply(from, resMsg.error.botAdm, id)
                        const allMem = await client.getGroupMembers(groupId)
                        for (let i = 0; i < allMem.length; i++) {
                            if (groupAdmins.includes(allMem[i].id)) {

                            } else {
                                await client.removeParticipant(groupId, allMem[i].id)
                            }
                        }
                        client.reply(from, 'Success kick all member', id)
                        break

                    //Owner Bot
                    case 'ban':
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        if (args.length == 0) return client.reply(from, `Untuk banned seseorang agar tidak bisa menggunakan commands\n\nCaranya ketik: \n${prefix}ban add 628xx --untuk mengaktifkan\n${prefix}ban del 628xx --untuk nonaktifkan\n\ncara cepat ban banyak digrup ketik:\n${prefix}ban @tag @tag @tag`, id)
                        if (args[0] == 'add') {
                            banned.push(args[1] + '@c.us')
                            fs.writeFileSync('./data/banned.json', JSON.stringify(banned))
                            client.reply(from, 'Success banned target!', id)
                        } else
                            if (args[0] == 'del') {
                                let xnxx = banned.indexOf(args[1] + '@c.us')
                                banned.splice(xnxx, 1)
                                fs.writeFileSync('./data/banned.json', JSON.stringify(banned))
                                client.reply(from, 'Success unbanned target!', id)
                            } else {
                                for (let i = 0; i < mentionedJidList.length; i++) {
                                    banned.push(mentionedJidList[i])
                                    fs.writeFileSync('./data/banned.json', JSON.stringify(banned))
                                    client.reply(from, 'Success ban target!', id)
                                }
                            }
                        break

                    case 'bc': //untuk broadcast atau promosi
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        if (args.length == 0) return client.reply(from, `Untuk broadcast ke semua chat ketik:\n${prefix}bc [isi chat]`)
                        const chatz = await client.getAllChatIds()
                        for (let idk of chatz) {
                            var cvk = await client.getChatById(idk)
                            await client.sendText(idk, `???????????? *BOT Broadcast* ????????????\n\n${arg}`)
                        }
                        client.reply(from, 'Broadcast Success!', id)
                        break

                    case 'leaveall': //mengeluarkan bot dari semua group serta menghapus chatnya
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        const allChatz = await client.getAllChatIds()
                        const allGroupz = await client.getAllGroups()
                        for (let gclist of allGroupz) {
                            await client.sendText(gclist.contact.id, `Maaf bot sedang pembersihan, total chat aktif : ${allChatz.length}. Invite dalam *beberapa menit* kemudian!`)
                            await client.leaveGroup(gclist.contact.id)
                            await client.deleteChat(gclist.contact.id)
                        }
                        client.reply(from, 'Success leave all group!', id)
                        break

                    case 'clearexitedgroup': //menghapus group yang sudah keluar
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        const allGroupzs = await client.getAllGroups()
                        for (let gc of allGroupzs) {
                            if (gc.isReadOnly){
                                await client.deleteChat(gc.id)
                            }
                        }
                        client.reply(from, 'Success clear all exited group!', id)
                        break

                    case 'clearall': //menghapus seluruh pesan diakun bot
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        const allChatx = await client.getAllChats()
                        for (let dchat of allChatx) {
                            await client.deleteChat(dchat.id)
                        }
                        client.reply(from, 'Success clear all chat!', id)
                        break

                    case 'clearallnongroup': //menghapus seluruh pesan diakun bot selain group
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        const allChat1 = await client.getAllChats()
                        for (let dchat of allChat1) {
                            if (!dchat.isGroup) await client.deleteChat(dchat.id)
                        }
                        client.reply(from, 'Success clear all private chat!', id)
                        break

                    case 'refresh':
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        await client.reply(from, `Refreshing web whatsapp page!`, id)
                        setTimeout(async () => {
                            try{
                                await client.refresh().then(async() => {
                                    await console.log(`Bot refreshed!`)
                                    await client.reply(from, `Bot refreshed!`, id)
                                })
                            }catch (err) {
                                console.log(color('[ERROR]', 'red'), err)
                            }
                        }, 2000)                         
                    break

                    case 'unblock': {
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        if (args.length === 0) return client.reply(from, `Untuk unblock kontak, ${prefix}unblock 628xxx`, id)
                        await client.contactUnblock(`${arg}@c.us`).then(() => {
                            client.reply(from, `Berhasil unblock ${arg}.`, id)
                        }).catch(e => {
                            console.log(e)
                            client.reply(from, resMsg.error.norm, id)
                        })
                        break
                    }

                    case '>':
                        if (!isOwnerBot) return client.reply(from, resMsg.error.owner, id)
                        client.simulateTyping(from, false)
                        try{
                            eval(arg)
                        }catch (e) {
                            console.log(e)
                            client.sendText(from, `${e.name}: ${e.message}`)
                        }
                    break

                    default:
                        await client.sendText(from, `Perintah tidak ada.\n${prefix}menu untuk melihat daftar perintah!`)
                    break

                }

            })//typing
        }

        // Kata kasar function
        if (!isCmd && isGroupMsg && isNgegas && chat.type !== "image") {
            const _denda = _.sample([1000, 2000, 3000, 5000, 10000])
            const find = db.get('group').find({ id: groupId }).value()
            if (find && find.id === groupId) {
                const cekuser = db.get('group').filter({ id: groupId }).map('members').value()[0]
                const isIn = inArray(pengirim, cekuser)
                if (cekuser && isIn !== false) {
                    if (isKasar) {
                        const denda = db.get('group').filter({ id: groupId }).map('members[' + isIn + ']').find({ id: pengirim }).update('denda', n => n + _denda).write()
                        if (denda) {
                            await client.reply(from, `${resMsg.badw}\n\nDenda +${_denda}\nTotal : Rp` + formatin(denda.denda), id)
                            if (denda.denda >= 5000000) {
                                banned.push(pengirim)
                                fs.writeFileSync('./data/banned.json', JSON.stringify(banned))
                                client.reply(from, `??????????????? SELAMAT ??????\n???\n??? Anda telah dibanned oleh bot.\n??? Karena denda anda melebihi 5 Juta.\n??? Mampos~\n???\n??? Denda -5.000.000\n???\n????????? SeroBot ???`, id)
                                db.get('group').filter({ id: groupId }).map('members[' + isIn + ']').find({ id: pengirim }).update('denda', n => n-5000000).write()
                            }
                        }
                    }
                } else {
                    const cekMember = db.get('group').filter({ id: groupId }).map('members').value()[0]
                    if (cekMember.length === 0) {
                        if (isKasar) {
                            db.get('group').find({ id: groupId }).set('members', [{ id: pengirim, denda: _denda }]).write()
                        } else {
                            db.get('group').find({ id: groupId }).set('members', [{ id: pengirim, denda: 0 }]).write()
                        }
                    } else {
                        const cekuser = db.get('group').filter({ id: groupId }).map('members').value()[0]
                        if (isKasar) {
                            cekuser.push({ id: pengirim, denda: _denda })
                            await client.reply(from, `${resMsg.badw}\n\nDenda +${_denda}`, id)
                        } else {
                            cekuser.push({ id: pengirim, denda: 0 })
                        }
                        db.get('group').find({ id: groupId }).set('members', cekuser).write()
                    }
                }
            } else {
                if (isKasar) {
                    db.get('group').push({ id: groupId, members: [{ id: pengirim, denda: _denda }] }).write()
                    await client.reply(from, `${resMsg.badw}\n\nDenda +${_denda}\nTotal : Rp${_denda}`, id)
                } else {
                    db.get('group').push({ id: groupId, members: [{ id: pengirim, denda: 0 }] }).write()
                }
            }
        }
    } catch (err) {
        console.log(color('[ERROR]', 'red'), err)
    }
}
