

e("products/create", incoming)
.create(incoming)
.mine()
.return(200)

e("products/list", incoming)
.filter(incoming)
.paginate(incoming)
.return(200)

e("products/get/:id", incoming)
.get(incoming)
.return(200)

e("products/update/:id", incoming)
.update(incoming)
.mine()
.return(200)

e("products/delete/:id", incoming)
.delete(incoming)
.mine()
.return(200)
