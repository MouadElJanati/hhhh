const axios = require('axios')
const fs = require('fs-extra')
const {apiTobz, apiVH, apiFarzain} = JSON.parse(fs.readFileSync('./settings/api.json'))

const quote = async () => new Promise((resolve, reject) => {
    axios.get(`https://arugaz.herokuapp.com/api/randomquotes`)
    .then((res) => {
        const text = `Author: ${res.data.author}\n\nQuote: ${res.data.quotes}`
        resolve(text)
    })
    .catch((err) =>{
        reject(err)
    })
})

const ytsearch = async (query) => new Promise((resolve, reject) => {
    axios.get(`https://videfikri.com/api/ytsearch/?query=${encodeURIComponent(query)}`)
    .then((res) => {
        const result = res.data.result.data[0]
        resolve(result)

    }).catch((err) => {
        reject(err)
    })
})

const artinama = async (nama) => new Promise((resolve, reject) => {
	axios.get(`https://arugaz.herokuapp.com/api/artinama?nama=${encodeURIComponent(nama)}`)
	.then((res) => {
		resolve(res.data.result)
	})
	.catch((err) => {
		reject(err)
	})
})

const cuaca = async (daerah) => new Promise((resolve, reject) => {
    axios.get(`https://rest.farzain.com/api/cuaca.php?id=${encodeURIComponent(daerah)}&apikey=${apiFarzain}`)
    .then((res) => {
		if (res.data.respon.cuaca == null) resolve('Maaf daerah kamu tidak tersedia')
        const text = `Cuaca di: ${res.data.respon.tempat}\n\nCuaca: ${res.data.respon.cuaca}\nAngin: ${res.data.respon.angin}\nDesk: ${res.data.respon.deskripsi}\nKelembapan: ${res.data.respon.kelembapan}\nSuhu: ${res.data.respon.suhu}\nUdara: ${res.data.respon.udara}`
        resolve(text)
    })
    .catch((err) =>{
        reject(err)
    })
})

const tulis = async (teks) => new Promise((resolve, reject) => {
    axios.get(`https://alfians-api.herokuapp.com/nulis?text=${encodeURIComponent(teks)}`)
    .then((res) => {
        resolve(`${res.data.result}`)
    })
    .catch((err) => {
        reject(err)
    })
})

module.exports = {
    quote,
    artinama,
    cuaca,
    tulis,
    ytsearch
}