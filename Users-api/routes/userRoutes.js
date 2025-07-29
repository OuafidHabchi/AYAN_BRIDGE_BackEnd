import express from "express";
import { createUser, getUsers,loginUser,getUserById ,savePromoCode,updateUserProfile ,validatePromoCodeForTarget ,getRejectedOrPendingCreationsByUser} from "../controllers/userController.js";

const router = express.Router();

router.post("/createaccount", createUser);
router.get("/AllUsers", getUsers);
router.post("/login", loginUser);

// 💡 get user info by son id
router.get('/:id', getUserById); 

//saver mon code promo depui le profile 
router.put("/promo/save", savePromoCode);

// update le profile user( email,tel, langue )
router.put('/update/:id', updateUserProfile);

// validation de code promo pour un utilisateur cible
router.post('/codePromoValidation', validatePromoCodeForTarget);

// reccupere les creation non approuver de user 
router.get('/contenus-rejetes-ou-attente/:id', getRejectedOrPendingCreationsByUser);



export default router;
