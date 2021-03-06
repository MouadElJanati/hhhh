const fs = require('fs-extra')
const { 
    prefix
} = JSON.parse(fs.readFileSync('./settings/setting.json'))

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textTnC = () => {
    return `
Dengan menggunakan bot ini maka anda setuju dengan Syarat dan Kondisi sebagai berikut:
- Dilarang keras melakukan spam karena akan membebani server, ketahuan = banned.
- bot tidak menyimpan gambar/media yang dikirimkan.
- bot tidak menyimpan data pribadi anda di server kami.
- bot tidak bertanggung jawab atas perintah anda kepada bot ini.
Source code bisa dilihat di https://github.com/dngda/bot-whatsapp

Best regards, 

Danang.`
}

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textMenu = (pushname) => {
    return `
Hi, ${pushname}! đïž
Berikut adalah beberapa fitur yang ada pada bot ini!âš

ââââȘă Fitur BOT ăâȘ
â â„ ${prefix}donate _or_ ${prefix}donasi
â â„ ${prefix}ping _or_ ${prefix}speed
â â„ ${prefix}menu _or_ ${prefix}help
â â„ ${prefix}owner
â â„ ${prefix}stat
â â„ ${prefix}tnc
â
â âââȘă Converter ăâȘ
â â„ ${prefix}getimage _or_ ${prefix}stickertoimg
â â„ ${prefix}sticker _or_ ${prefix}stiker
â â„ ${prefix}stickergiphy
â â„ ${prefix}stickergif
â â„ ${prefix}doctopdf _or_ ${prefix}pdf
â â„ ${prefix}qrcode _or_ ${prefix}qr
â â„ ${prefix}tts _or_ ${prefix}say
â â„ ${prefix}shortlink
â â„ ${prefix}translate
â â„ ${prefix}ytmp3
â â„ ${prefix}memefy
â â„ ${prefix}nulis
â â„ ${prefix}hilih
â â„ ${prefix}play
â â„ ${prefix}ytmp3
â
â âââȘă Islam ăâȘ
â â„ ${prefix}listsurah
â â„ ${prefix}infosurah
â â„ ${prefix}jsholat
â â„ ${prefix}alaudio
â â„ ${prefix}tafsir
â â„ ${prefix}surah
â
â âââȘă Random ăâȘ
â â„ ${prefix}katabijak
â â„ ${prefix}artinama
â â„ ${prefix}skripsi
â â„ ${prefix}pantun
â â„ ${prefix}apakah
â â„ ${prefix}fakta
â â„ ${prefix}quote
â
â âââȘă Hiburan ăâȘ
â â„ ${prefix}images _or_ ${prefix}pin
â â„ ${prefix}whatanime
â â„ ${prefix}sreddit
â â„ ${prefix}anime
â â„ ${prefix}memes
â â„ ${prefix}kpop
â â„ ${prefix}ToD
â
â âââȘă Info ăâȘ
â â„ ${prefix}ceklokasi
â â„ ${prefix}crjogja
â â„ ${prefix}cuaca
â â„ ${prefix}resi
â â„ ${prefix}kbbi
â
â âââȘă Anti Toxic ăâȘ
â â„ ${prefix}katakasar
â â„ ${prefix}klasemen
â â„ ${prefix}reset
â
â âââȘă More Useful ăâȘ
â â„ ${prefix}tagall _or_ ${prefix}alle
â â„ ${prefix}list (new)
â â„ ${prefix}join
â â„ ${prefix}bye
â â„ ${prefix}del
â
ââă *SeroBot* ă

Hope you have a great day!âš
Jangan ditelfon or blocked instantly!

Kalau anda merasa bot ini membantu/berguna silakan berdonasi âš`
}

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textAdmin = () => {
    return `
â  [ *Admin Group Only* ] â  
Berikut adalah fitur admin grup yang ada pada bot ini!

ââââȘă Admin ONLY ăâȘ
â â„ ${prefix}setprofile
â â„ ${prefix}grouplink
â â„ ${prefix}mutegrup
â â„ ${prefix}promote
â â„ ${prefix}welcome (beta)
â â„ ${prefix}demote
â â„ ${prefix}revoke
â â„ ${prefix}kick
â â„ ${prefix}add
â
â âââȘă Owner Group ONLY ăâȘ
â â„ ${prefix}kickall
â
ââă *SeroBot* ă
`
}

/*

Dimohon untuk tidak menghapus link github saya, butuh support dari kalian! makasih.

*/

exports.textDonasi = () => {
    return `
Hai, terimakasih telah menggunakan bot ini, untuk mendukung bot ini kamu dapat membantu dengan berdonasi dengan cara:

Ovo/Gopay/Dana: 0823 1048 7958
Paypal: https://paypal.me/dngda
saweria: https://saweria.co/dngda
Trakteer: https://trakteer.id/dngda

Bitcoin : 14vHto4CCXmEwC6BVsifyVmMxxsGydRHCS
USDT (Trc20) : TB29LW37akLR5VmCkatK3ppxftUogSA8SU

Berapapun nominalnya akan sangat membantu pengembangan bot ini.
Terimakasih. ~Danang`
}