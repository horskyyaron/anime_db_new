import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// create the connection to database
const connection = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

/**
 * get all users.
 *
 * @async
 * @returns {Promise<array>} array of users.
 */
export async function getProfiles() {
  try {
    // [rows] - the first item out of the result array. destructuring assignment.
    const [rows] = await connection.query("select * from profiles limit 2");
    return rows;
  } catch (err) {
    return err;
  }
}

// Veronin 44430
// prepared statement = ?
/**
 * return profile name from given profile id.
 *
 * @async
 * @param {int} id - profile id
 * @returns {Promise<string>} profile name.
 */
export async function getProfileName(id) {
  try {
    // [rows] - the first item out of the result array. destructuring assignment.
    const [rows] = await connection.query(
      `
    select profile_name 
    from profiles 
    where id = ? 
    `,
      [id]
    );
    return rows;
  } catch (err) {
    return err;
  }
}

/**
 * return number of users in the database.
 *
 * @async
 * @returns {Promise<int>} total number of users.
 */
export async function getNumOfUsers() {
  try {
    // [rows] - the first item out of the result array. destructuring assignment.
    const [rows] = await connection.query(`
    select count(profile_name) as total
    from profiles 
    `);
    return rows[0]["total"];
  } catch (err) {
    return err;
  }
}

/**
 * checks if username exists in database.
 *
 * @async
 * @param {string} username - chosen username by the user.
 * @returns {Promise<boolean>} true is taken, false otherwise.
 */
export async function isUsernameTaken(username) {
  try {
    // [rows] - the first item out of the result array. destructuring assignment.
    const [is_taken] = await connection.query(
      `
    select * from profiles
    where profile_name = ?
    `,
      [username]
    );
    if (is_taken.length > 0) {
      return true;
    }

    return false;
  } catch (err) {
    return err;
  }
}

/**
 * [TODO:description]
 *
 * @async
 * @param {[TODO:type]} profile_name - [TODO:description]
 * @param {[TODO:type]} gender - [TODO:description]
 * @param {[TODO:type]} birthday - [TODO:description]
 * @param {[TODO:type]} password - [TODO:description]
 * @returns {Promise<[TODO:type]>} [TODO:description]
 */
export async function createUser(profile_name, gender, birthday, password) {
  try {
    if (await isUsernameTaken(profile_name)) {
      console.log("taken!");
      return null;
    }
    // [rows] - the first item out of the result array. destructuring assignment.
    const total_users = await getNumOfUsers();

    const id = total_users + 1;
    const result = await connection.query(
      `
    insert into profiles (id,profile_name,password,gender,birthday)
    values(?,?,?,?,?)
    `,
      [id, profile_name, password, gender, birthday]
    );
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * check login check credentials and check is exits in database.
 *
 * @async
 * @param {string} username - username
 * @param {string} password - password
 * @returns {Promise<boolean>} true if credintals exits in database, false otherwise
 */
export async function check_credentials(username, password) {
  try {
    // [rows] - the first item out of the result array. destructuring assignment.
    const [result] = await connection.query(
      `
        SELECT * FROM profiles WHERE profile_name = ? AND password = ?
    `,
      [username, password]
    );
    let res = true;
    if (result.length == 0) {
      console.log("doesn't exits!");
            res = false
    } else {
      console.log("exits!");
    }
    return res;
  } catch (err) {
    return err;
  }
}

/**
 * return 'anime' avg scroe calculated by users reviews.
 *
 * @async
 * @param {string} anime_name - anime_name
 * @returns {Promise<float>} anime avg score
 */
export async function getAnimeAvgScroe(anime_name) {
  try {
    const [result] = await connection.query(
      `
    select avg(score) as avg from reviews
    where anime_uid = (
    select uid from animes
    where title=?
    )
    `,
      [anime_name]
    );
    return result[0]["avg"];
  } catch (err) {
    return err;
  }
}
//

/**
 * return top ranking animes.
 * ranking by avg score from users reviews.
 * top ranking candidate is an anime which have at least 'min_rev' reviews.
 * return top 'k' animes.
 *
 *
 * @async
 * @param {int} k - how many animes are considered 'top'
 * @param {int} min_rev - minimum number of reviews to be a candidate anime for 'top' anime.
 * @returns {Promise<array>} array of the top animes.
 */
export async function getTopAnimes(k, min_rev) {
  try {
    const [result] = await connection.query(
      `
select title, avg_score, img_url from (select anime_uid, avg_score from(select anime_uid,COUNT(DISTINCT(profile)) as times_reviewed, AVG(score) as avg_score  
FROM reviews  
GROUP BY anime_uid  
having times_reviewed > ? 
order by avg_score desc  
limit ?
) as t ) as t2  
inner join animes  
on t2.anime_uid = animes.uid  
order by avg_score desc ;
`,
      [min_rev, k]
    );
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * return useres favorite animes.
 *
 * @async
 * @param {int} id - user's profile id
 * @returns {Promise<array>} array of favorites animes (title,img_url).
 */
export async function getUserFavAnimes(id) {
  try {
    const [result] = await connection.query(
      `
select title, img_url from favorites  
inner join animes 
on favorites.fav_anime_id = animes.uid 
where profile_id = 4 
    `,
      [id]
    );
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * return all genres in the database.
 *
 * @async
 * @returns {Promise<array>} list of all genres.
 */
export async function getAllGenres() {
  try {
    const [result] = await connection.query(
      `select distinct genre_name from anime_genre`
    );
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * return all animes that are in one of the given genre list categories.
 *
 * @async
 * @param {string} genres - list of ',' seperated genres.
 * @returns {Promise<array>} animes
 */
export async function getAnimeByGenreList(genres) {
  try {
    const [result] = await connection.query(
      `
select uid, title, summary, aired, ended, episodes, img_url from ( 
select anime_id from anime_genre  
where genre_name in (?) 
) as t  
join animes on t.anime_id = animes.uid;
`,
      [genres]
    );
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * returns most active users according to their number of reviews
 *
 * @async
 * @param {int} k - selecting top K useres
 * @returns {Promise<Array>} array of most active users object. json.
 */
export async function getMostActiveUsers(k) {
  try {
    const [result] = await connection.query(
      `
select profile, count(profile) as num_of_reviews from reviews  
group by profile  
order by num_of_reviews desc limit ? 
`,
      [k]
    );
    return result;
  } catch (err) {
    return err;
  }
}