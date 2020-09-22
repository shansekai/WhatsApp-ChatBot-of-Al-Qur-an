const { create, decryptMedia } = require('@open-wa/wa-automate')
const axios = require('axios')
const moment = require('moment')
const color = require('./lib/color')
const serverOption = {
  headless: true,
  qrRefreshS: 20,
  qrTimeout: 0,
  authTimeout: 0,
  autoRefresh: true,
  cacheEnabled: false,
  chromiumArgs: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
}

const opsys = process.platform
if (opsys === 'win32' || opsys === 'win64') {
  serverOption.executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
} else if (opsys === 'linux') {
  //serverOption.browserRevision = '737027' 
  serverOption.browserRevision = '800071'
} else if (opsys === 'darwin') {
  serverOption.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
}

const startServer = async () => {
  create('Imperial', serverOption)
    .then(client => {
      console.log('[SERVER] Server Started!')
      client.onStateChanged(state => {
        console.log('[Client State]', state)
        if (state === 'CONFLICT') client.forceRefocus()
      })

      client.onMessage((message) => {
        msgHandler(client, message)
      })
    })
}

async function msgHandler (client, message) {
  try {
    const { type, body, from, t, sender, isGroupMsg, chat, caption, isMedia, mimetype, quotedMsg, chatId, Contact, author } = message
    const { pushname } = sender
    const { formattedTitle } = chat
    const time = moment(t * 1000).format('DD/MM HH:mm:ss')
    const commands = ['/info surah', '/surah', '/tafsir', '/audio', '/menu']
    const cmds = commands.map(x => x + '\\b').join('|')
    const cmd = type === 'chat' ? body.match(new RegExp(cmds, 'gi')) : type === 'image' && caption ? caption.match(new RegExp(cmds, 'gi')) : ''

    if (cmd) {
      !isGroupMsg ? console.log(color('[EXEC]'), color(time, 'yellow'), color(cmd[0]), 'from', color(pushname)) : console.log(color('[EXEC]'), color(time, 'yellow'), color(cmd[0]), 'from', color(pushname), 'in', color(formattedTitle))
      const args = body.trim().split(' ')
      const isUrl = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi)
      switch (cmd[0].toLowerCase()) {
        case '/menu':
        case '/help':
          client.sendText(from, `Bismillah.. Halo *${pushname}*\n\nBerikut adalah menu yang bisa dipakai,\n\n*_/info surah <nama surah>_*\nMenampilkan informasi lengkap mengenai surah tertentu. Contoh penggunan: /info surah al-baqarah\n\n*_/surah <nama surah> <ayat>_*\nMenampilkan ayat Al-Qur'an tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : /surah al-fatihah 1\n*_/surah <nama surah> <ayat> en_*\nMenampilkan ayat Al-Qur'an tertentu beserta terjemahannya dalam bahasa Inggris. Contoh penggunaan : /surah al-fatihah 1 en\n\n*_/tafsir <nama surah> <ayat>_*\nMenampilkan ayat Al-Qur'an tertentu beserta terjemahan dan tafsirnya dalam bahasa Indonesia. Contoh penggunaan : /tafsir al-fatihah 1\n\n*_/audio <nama surah>_*\nMenampilkan tautan dari audio surah tertentu. Contoh penggunaan : /audio al-fatihah\n*_/audio <nama surah> <ayat>_*\nMengirim audio surah dan ayat tertentu. Contoh penggunaan : /audio al-fatihah 1\n\nCatatan: Perintah diawali dengan prefiks garing (/). Pastikan juga ketika mengetik nama surah menggunakan tanda hubung (-)\n`)
          break
        case '/info surah':
          if (body.length > 12) {
            const response = await axios.get('https://api.quran.sutanlab.id/surah')
            const { data } = response.data
            var idx = data.findIndex(function(post, index) {
              if((post.name.transliteration.id.toLowerCase() == args[2].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[2].toLowerCase()))
                return true;
            });
            var pesan = ""
            pesan = pesan + "Nama : "+ data[idx].name.transliteration.id + "\n" + "Asma : " +data[idx].name.short+"\n"+"Arti : "+data[idx].name.translation.id+"\n"+"Jumlah ayat : "+data[idx].numberOfVerses+"\n"+"Nomor surah : "+data[idx].number+"\n"+"Jenis : "+data[idx].revelation.id+"\n"+"Keterangan : "+data[idx].tafsir.id
            client.sendText(from, pesan)
        }
          break
        case '/surah':
          if (body.length > 6) {
            const response = await axios.get('https://api.quran.sutanlab.id/surah')
            const { data } = response.data
            var idx = data.findIndex(function(post, index) {
              if((post.name.transliteration.id.toLowerCase() == args[1].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[1].toLowerCase()))
                return true;
            });
            nmr = data[idx].number
            if(!isNaN(nmr)) {
              const responsi2 = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[2])
              const {data} = responsi2.data
              var last = function last(array, n) {
                if (array == null) return void 0;
                if (n == null) return array[array.length - 1];
                return array.slice(Math.max(array.length - n, 0));
              };
              bhs = last(args)
              pesan = ""
              pesan = pesan + data.text.arab + "\n\n"
              if(bhs == "en") {
                pesan = pesan + data.translation.en
              } else {
                pesan = pesan + data.translation.id
              }
              pesan = pesan + "\n\n(Q.S. "+data.surah.name.transliteration.id+":"+args[2]+")"
              client.sendText(from, pesan)
            }
          }
          break
        case '/tafsir':
          if (body.length > 7) {
            const respons = await axios.get('https://api.quran.sutanlab.id/surah')
            const {data} = respons.data
            var idx = data.findIndex(function(post, index) {
              if((post.name.transliteration.id.toLowerCase() == args[1].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[1].toLowerCase()))
                return true;
            });
            nmr = data[idx].number
            if(!isNaN(nmr)) {
              const responsi = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[2])
              const {data} = responsi.data
              pesan = ""
              pesan = pesan + "Tafsir Q.S. "+data.surah.name.transliteration.id+":"+args[2]+"\n\n"
              pesan = pesan + data.text.arab + "\n\n"
              pesan = pesan + "_" + data.translation.id + "_" + "\n\n" +data.tafsir.id.long
              client.sendText(from, pesan)
          }
        }
          break
        case '/audio':
          ayat = ""
          bhs = ""
          if (body.length > 6) {
            const response = await axios.get('https://api.quran.sutanlab.id/surah')
            const surah = response.data
            var idx = surah.data.findIndex(function(post, index) {
              if((post.name.transliteration.id.toLowerCase() == args[1].toLowerCase())||(post.name.transliteration.en.toLowerCase() == args[1].toLowerCase()))
                return true;
            });
            nmr = surah.data[idx].number
            if(!isNaN(nmr)) {
              if (args.length > 2) {
                ayat = args[2]
              } 
              if (args.length > 3) {
                bhs = args[3]
              }
              pesan = ""
              if(!isNaN(ayat)) {
                const responsi2 = await axios.get('https://raw.githubusercontent.com/penggguna/QuranJSON/master/surah/'+nmr+'.json')
                const {name, name_translations, number_of_ayah, number_of_surah,  recitations} = responsi2.data
                pesan = pesan + "Audio Quran Surah ke-"+number_of_surah+" "+name+" ("+name_translations.ar+") "+ "dengan jumlah "+ number_of_ayah+" ayat\n"
                pesan = pesan + "Dilantunkan oleh "+recitations[0].name+" : "+recitations[0].audio_url+"\n"
                pesan = pesan + "Dilantunkan oleh "+recitations[1].name+" : "+recitations[1].audio_url+"\n"
                pesan = pesan + "Dilantunkan oleh "+recitations[2].name+" : "+recitations[2].audio_url+"\n"
                client.sendText(from, pesan)
              } else {
                const responsi2 = await axios.get('https://api.quran.sutanlab.id/surah/'+nmr+"/"+args[2])
                const {data} = responsi2.data
                var last = function last(array, n) {
                  if (array == null) return void 0;
                  if (n == null) return array[array.length - 1];
                  return array.slice(Math.max(array.length - n, 0));
                };
                bhs = last(args)
                pesan = ""
                pesan = pesan + data.text.arab + "\n\n"
                if(bhs == "en") {
                  pesan = pesan + data.translation.en
                } else {
                  pesan = pesan + data.translation.id
                }
                pesan = pesan + "\n\n(Q.S. "+data.surah.name.transliteration.id+":"+args[2]+")"
                await client.sendFileFromUrl(from, data.audio.secondary[0])
                await client.sendText(from, pesan)
              }
          }
          }
          break
        }
    } else {
      !isGroupMsg ? console.log('[RECV]', color(time, 'yellow'), 'Message from', color(pushname)) : console.log('[RECV]', color(time, 'yellow'), 'Message from', color(pushname), 'in', color(formattedTitle), color(chatId), color(author))
    }
  } catch (err) {
    console.log(color('[ERROR]', 'red'), err)
  }
}

process.on('Something went wrong', function (err) {
  console.log('Caught exception: ', err)
})

startServer()
