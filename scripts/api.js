const VAndAEndpoint =
  'https://api.vam.ac.uk/v2/objects/search?kw_system_number='

const titleElement = document.querySelector('.object-title')
const imageElement = document.querySelector('.object-image')

const bookmarksList = document.querySelector('.bookmarks-list')

async function getVAndAObject (url) {
  const id = url.split("/").pop();

  await fetch(`${VAndAEndpoint}${id}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data)

      if (data.records.length === 1) {
        titleElement.innerHTML = data.records[0]._primaryTitle;

        if (data.records[0]._images?._iiif_image_base_url) {
          imageElement.setAttribute('src', `${data.records[0]._images._iiif_image_base_url}full/!300,300/0/default.jpg`)
        } else {
          imageElement.setAttribute('src', '')
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
    .then(data => {
      console.log(data)

      if (data?.data?.attributes?.summary_title) {
        titleElement.innerHTML = data.data.attributes.summary_title
      }
      if (data?.data?.attributes?.multimedia && data.data.attributes.multimedia.length > 0 && data.data.attributes.multimedia[0].processed?.large_thumbnail) {
        imageElement.setAttribute('src', data.data.attributes.multimedia[0].processed.large_thumbnail.location)
      } else {
        imageElement.setAttribute('src', '')
      }
    });
}

const pushToBookmarks = (object) => {
  if (object) {
    bookmarksList.innerHTML += `<li><a href="${object.id}" target="_blank">${titleElement.innerHTML}</a></li>`
  }
}
