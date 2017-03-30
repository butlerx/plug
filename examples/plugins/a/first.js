exports.connect = (name, age, callback) => {
  console.log(`I belong to ${name}`)
  callback({
    sport: 'Fishing',
  })
}
