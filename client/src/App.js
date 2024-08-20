import {useState} from 'react'
import './App.css';
import {ApolloClient, InMemoryCache, ApolloProvider, gql, useMutation, useQuery} from '@apollo/client'
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs'
const client = new ApolloClient({
  link: createUploadLink({uri: 'http://localhost:5000/graphql'}),
  cache: new InMemoryCache()
})


const UPLOAD_FILES = gql`
  mutation addFiles($files: [Upload!]){
    addUploads(files: $files){
      filename,
      mimetype,
      encoding
    }
  }
`
const GET_QUERY = gql`
  query {
    hello
  }
`
function App() {
  const [files, setFiles] = useState(null)
  const {data, loading, error} = useQuery(GET_QUERY)
  const [upload] = useMutation(UPLOAD_FILES, {variables: {files: files}})


  function uploadfiles(){

    upload(files)
  }

  return (
    <div className="App">
      <input type = "file" multiple  onChange={(e)=>setFiles(e.target.files)}/>
      <button onClick={uploadfiles}>Upload</button>
    </div>
  );
}

function modifyModule(Comp){
  return function(props){
    return <ApolloProvider client= {client}>
      <Comp {...props}/>
    </ApolloProvider>
  }
}


export default modifyModule(App);
