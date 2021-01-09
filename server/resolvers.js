const { jobs } = require('./db')
const db = require('./db')

const Query = {
  greeting: () => 'Nanda Gopal',
  jobs: () => db.jobs.list(),
  job: (_, args) => db.jobs.get(args.id),
  company: (_, args) => db.companies.get(args.id)
}

// the jobs feild is inside the Company type, to reflect the structure of 
// the schema our jobs resolver should also be inside a company object
const Company = {
  jobs: (company) => db.jobs.list().filter(job => company.id === job.companyId)
}

const Job = {
  company: (job) => db.companies.get(job.companyId)
}


const Mutation = {
  // ctx <- access things that are not part of graphql itself but are provided by our application
  // ctx <- can contain whatever we want but it's upto us to put something into the context in the first place
  createJob: (_, { input }, ctx) => {
    // check user auth
    if(!ctx.user) {
      throw new Error('Unauthorized')
    }

    const id = db.jobs.create({ ...input, companyId: ctx.user.companyId })
    return db.jobs.get(id)
  }
}

module.exports = {
  Query,
  Job,
  Company,
  Mutation
}