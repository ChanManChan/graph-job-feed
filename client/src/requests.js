import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost'
import { getAccessToken, isLoggedIn } from './auth'
import gql from 'graphql-tag'

const URL = 'http://localhost:9000/graphql'

const authLink = new ApolloLink((operation, forward) => {
  if(isLoggedIn()) {
    operation.setContext({
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    })
  }
  return forward(operation)
})

const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({ uri: URL })
  ]),
  cache: new InMemoryCache()
})

async function graphqlRequest(query, variables = {}) {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(isLoggedIn() ? { 'Authorization': `Bearer ${getAccessToken()}` } : {})
    },
    body: JSON.stringify({ query, variables })
  }

  const response = await fetch(URL, request)

  const responseBody = await response.json()

  if(responseBody.errors) {
    const message = responseBody.errors.map(err => err.message).join('\n')
    throw new Error(message)
  }

  return responseBody.data
}

const jobDetailsFragment = gql`fragment JobDetail on Job {
  id
  title
  company {
    id
    name
  }
  description
}` 

const createJobMutation = gql`mutation CreateJob($input: CreateJobInput) {
  job: createJob(input: $input) {
    ...JobDetail
  }
}
  ${jobDetailsFragment}
`

const companyQuery = gql`query CompanyQuery($id: ID!) {
  company(id: $id) {
    name
    id
    description
    jobs {
      id
      title
    }
  }
}`

const jobQuery = gql`query JobQuery($id: ID!) {
  job(id: $id) {
    ...JobDetail
  }
}
  ${jobDetailsFragment}
`

const jobsQuery = gql`query JobsQuery{
  jobs {
    id
    title
    company {
      id
      name
    }
  }
}`

export async function createJob(input) {
  const { data } = await client.mutate({ 
    mutation: createJobMutation, 
    variables: { input },
    // with this update function we are telling apollo client, whenever we run this mutation 'createJob', take the data 
    // returned in the response and save it to the cache as if it was the result of running the 'jobQuery' for that specific job id. 
    // This way we actually run a jobQuery with that job id it will find the data in the cache and avoid making a new call to the server.

    // update <- called after the mutation has been executed
    // data <- returned by the mutation
    update:  (cache, { data }) => {
      // save the newly created job into the cache
      cache.writeQuery({ 
        query: jobQuery, 
        variables: { id: data.job.id },
        data
      })
    }
  })

  // const { job } = await graphqlRequest(mutation, { input })
  return data.job
}


export async function loadCompany(id) {
  const { data } = await client.query({ query: companyQuery, variables: { id }})
  
  // const data = await graphqlRequest(query, { id })

  return data.company
}

export async function loadJobs() {
  // Without Apollo
  // const query = `{
  //   jobs {
  //     id
  //     title
  //     company {
  //       id
  //       name
  //     }
  //   }
  // }`

  const { data } = await client.query({ query: jobsQuery, fetchPolicy: 'no-cache' })
  
  // const data = await graphqlRequest(query)

  return data.jobs
}

export async function loadJob(id) {

  const { data } = await client.query({ query: jobQuery, variables: { id }})

  // const data = await graphqlRequest(query, { id })

  return data.job
}