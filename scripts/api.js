const VAndAEndpoint =
  'https://api.vam.ac.uk/v2/objects/search?kw_system_number='

const titleElement = document.querySelector('.object-title')
const imageElement = document.querySelector('.object-image')

async function getVAndAObject (id) {
  await fetch(`${VAndAEndpoint}${id}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data)

      if (data.records.length === 1) {
        titleElement.innerHTML = data.records[0]._primaryTitle;
        // titleElement.innerHTML = data.records[0]._primaryTitle;

        if (data.records[0]._images?._iiif_image_base_url) {
          imageElement.setAttribute('src', `${data.records[0]._images._iiif_image_base_url}/full/!300,300/0/default.jpg`)
        }
      }
    })
}

const ScienceMuseumUrl = 'https://collection.sciencemuseumgroup.org.uk/objects/co8084947'

async function getScienceMuseumObject (url) {
  await fetch(url, {
    headers : {'Accept': 'application/json' }
  })
    .then(response => response.json())
    .then(data => console.log(data));
}
