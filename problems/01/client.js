import DHT from '@hyperswarm/dht'

const node = new DHT()

const remotePublicKey = Buffer.from('cc240d6f68525f515816e4c09328eb37c6eea2e1ec9190910c93f536561ca447', 'hex')
const encryptedSocket = node.connect(remotePublicKey)

encryptedSocket.on('open', function () {
  console.log('Connected to server')
})

encryptedSocket.on('data', function (data) {
  console.log('Remote said:', data.toString())
})

