package edu.upenn.cis.nets212.hw2;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

import org.apache.livy.LivyClient;
import org.apache.livy.LivyClientBuilder;

import edu.upenn.cis.nets212.config.Config;

public class AdsorptionLivy {
	public static void main(String[] args) throws IOException, URISyntaxException, InterruptedException, ExecutionException {
		
		// REPLACE THIS WITH THE ACTUAL LIVY URI
		LivyClient client = new LivyClientBuilder()
				  .setURI(new URI("http://ec2-18-212-64-18.compute-1.amazonaws.com:8998")).build();

		try {
			String jar = "target/nets212-hw2-0.0.1-SNAPSHOT.jar";
			
		  System.out.printf("Uploading %s to the Spark context...\n", jar);
		  client.uploadJar(new File(jar)).get();
		

		  System.out.println("Running Adsorption Job");
		  List<Integer> result = client.submit(new AdsorptionJob()).get();

		} finally {
		  client.stop(true);
		}
	}

}
