class APIFeatures {
  constructor(DBquery, queryObject) {
    this.DBquery = DBquery;
    this.queryObject = queryObject;
  }

  filter() {
    // copying query object.
    const queryobj = { ...this.queryObject };
    const excludedFields = ["page", "sort", "limit", "fields", "search"];
    excludedFields.forEach((el) => delete queryobj[el]);

    // Advance filtering
    let queryString = JSON.stringify(queryobj);
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );
    console.log(JSON.parse(queryString));
    this.DBquery = this.DBquery.find(JSON.parse(queryString));
    return this;
  }

  sort() {
    if (this.queryObject.sort) {
      const sortBy = this.queryObject.sort.split(",").join(" ");
      this.DBquery = this.DBquery.sort(sortBy);
    } else {
      this.DBquery = this.DBquery.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryObject.fields) {
      const fields = this.queryObject.fields.split(",").join(" ");
      this.DBquery = this.DBquery.select(fields);
    } else {
      this.DBquery = this.DBquery.select("-__v");
    }
    return this;
  }

  pagination() {
    const page = this.queryObject.page || 1;
    const limit = this.queryObject.limit || process.env.PAGE_SIZE;
    console.log(limit);
    const skip = (page - 1) * limit;
    this.DBquery = this.DBquery.skip(skip).limit(limit);
    return this;
  }

  search() {
    if (this.queryObject.search) {
      const searchObj = {
        $regex: this.queryObject.search,
        $options: "i",
      };
      this.DBquery = this.DBquery.find({ name: searchObj });
    }
    return this;
  }
}

module.exports = APIFeatures;
